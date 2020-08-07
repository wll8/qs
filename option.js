const {
  util: {
    hasFile,
    QsError,
    setTitle,
    qsDataDir,
    qsTaskPath,
    qsConfigPath,
    qsPath,
    cfg,
    print,
    execWrap,
  },
  argParse: {
    task: taskArg,
    taskShowId,
    taskAdd,
    taskName,
    taskDes,
    taskStart,
    taskKill,
    taskRemove,
    explicit,
    regexp,
    config,
    configReset,
    open,
  },
  rawArgMore,
  task: taskFn,
 } = global.qs
const fs = require('fs')
const shelljs = require('shelljs')

module.exports = async () => {
  if(open) {
    const filePath = qsPath([qsDataDir, open])
    const openerArg = hasFile(filePath) ? filePath : open
    require('./lib/opener.js')(openerArg)
  }

  if(config === '') { // 查看所有配置
    print(`path: ${qsConfigPath}`)
    print(cfg.get())
  } else if (config) { // 查看或修改配置
    const [, key, val] = config.match(/(.+?)=(.*)/) || [, config]
    if(val !== undefined) {
      cfg.set(key, val)
      print(cfg.get(key))
    } else {
      print(cfg.get(key))
    }
  }

  if(configReset) {
    await require(qsPath('./util/init.js')).initCfg({cfg, qsPath, execWrap, configReset})
    print(cfg.get())
  }

  if(taskArg && taskArg.length === 0) { // 获取所有任务
    const taskList = await taskFn.get()
    taskList.forEach(item => {delete item.ppid; delete item.uid})
    print(`path: ${qsTaskPath}`)
    print(taskList)
  }

  if(taskArg && taskArg.length) { // 任务的查询及修改
    function parseKeyVal(str) {
      // 解析参数为 get,set 对象, 如果仅有 get 为空时, set 作为 get (为了符合单个=号习惯, 避免误修改)
      // 'a==1,c=2' => {get: {a: 1}, set: {c: 2}}
      // 'a=1' => {get: {a: 1}, set: {}}
      let get = {}
      let set = {}
      str.split(',').forEach(item => {
        {
          const [,key,val] = (item.match(/(.*)==(.*)/) || [])
          key && (get[key] = val)
        }
        {
          const [,key,val] = item.includes('==') ? [] : (item.match(/(.*)=(.*)/) || [])
          key && (set[key] = val)
        }
      })
      if(!Object.keys(get).length && Object.keys(set).length) {
        get = [set, set=get][0] // 无临时变量交换
      }
      return {get, set}
    }
    const {get, set} = taskArg.includes(',') ? parseKeyVal(taskArg) : parseKeyVal(rawArgMore.join(','))
    const taskList = await taskFn.get()
    let newTaskList = []
    taskList.forEach(item => {delete item.ppid; delete item.uid})
    const getKeys = Object.keys(get)
    const setKeys = Object.keys(set)
    if(getKeys.length > 0) { // 如果输入查询项才进行过滤, 否则显示全部
      newTaskList = taskList.filter(item => { // get
        let isFind = false
        getKeys.forEach(key => {
          if(item[key] === undefined) { // 仅使用输入的 key 进行匹配
            isFind = false
            return
          } else if(regexp) {
            const re = new RegExp(get[key])
            isFind = re.test(item[key])
          } else {
            isFind = item[key] == get[key]
          }
        })
        return isFind
      })
    }
    newTaskList = await (async () => {
      let list = []
      try {
        list = newTaskList.map(item => { // set
          setKeys.forEach(key => {
            if(
              key === 'taskId'
              || key === 'execList'
            ) {
              throw new QsError({code: 1, msg: `不允许直接修改 ${key} 字段`})
            }
            if(
              key === 'taskName'
              && (
                newTaskList.length > 1
                || taskList.some(taskItem => taskItem.taskName === set.taskName)
              )
            ) {
              throw new QsError({code: 2, msg: `不能修改为多个相同的 ${key}`})
            }
            item[key] = set[key]
          })
          return item
        })
      } catch (err) {
        print({
          code: err.code,
          msg: err.msg,
        })
      }
      return list
    })()

    for (let index = 0; index < newTaskList.length; index++) {
      const element = newTaskList[index]
      await taskFn.updateOne(element.taskId, element)
    }
    print(newTaskList)
  }

  { // 任务管理 add, name, des, start, kill, remove
    async function taskManage(taskIdOrName, method) {
      let {taskId} = (await taskFn.get(taskIdOrName)) || {}
      if(taskId !== undefined) {
        taskFn[method](taskId)
      } else {
        print(`没有找到任务 ${taskIdOrName}`)
      }
    }

    if(taskAdd) { // 初始化任务记录
      await taskFn.saveProcess() // 保存当前运行的进程信息, 其他的信息例如 taskName 都是补充参数
    }

    if(taskName || taskDes) { // 添加任务名称或描述
      const taskList = await taskFn.get()
      const find = taskList.find(item => (
        (taskName && (item.taskName === taskName))
        || (taskName && (item.taskId === Number(taskName)))
      ))
      if(find) {
        print(`存在与 ${taskName} 相同任务名称或ID`)
        taskFn.removeOne(taskFn.getCurlTaskId())
        process.exit()
      } else {
        const curtask = await taskFn.getCurlTask()
        curtask.taskName = taskName
        setTitle(taskName)
        curtask.taskDes = taskDes
        taskFn.updateOne(curtask.taskId, curtask)
      }
    }

    if(taskAdd && taskShowId) { // 只有在明确指定要输出 taskId 时, 才会输出, 这样可以避免污染命令输出
      print(`taskId: ${taskFn.getCurlTaskId()}\n`)
    }

    taskStart && taskManage(taskStart, 'start')
    taskKill && taskManage(taskKill, 'stop')
    taskRemove && taskManage(taskRemove, 'removeOne')
  }

}
