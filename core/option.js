const {
  util: {
    qsPath,
    cfg,
    print,
  },
  argParse: {
    taskName,
    taskAdd,
    taskStart,
    task,
    explicit,
    regexp,
  },
  rawArgMore,
  task: taskFn,
 } = global.qs
const fs = require('fs')
const shelljs = require('shelljs')

module.exports = async () => {
  if(task && task.length === 0) {
    const taskList = await taskFn.get()
    taskList.forEach(item => {delete item.ppid; delete item.uid})
    print(taskList)
  }
  if(task && task.length) { // 任务的查询及修改
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
    const {get, set} = task.includes(',') ? parseKeyVal(task) : parseKeyVal(rawArgMore.join(','))
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
          } else if (explicit) {
            isFind = item[key] === get[key]
          } else if(regexp) {
            const re = new RegExp(get[key])
            isFind = re.test(item[key])
          }
        })
        return isFind
      })
    }
    newTaskList = await (async () => {
      let list = []
      function MyError({code, msg}) {
        this.code = code
        this.msg = msg
        this.stack = (new Error()).stack
      }
      MyError.prototype = Object.create(Error.prototype)
      MyError.prototype.constructor = MyError
      try {
        list = newTaskList.map(item => { // set
          setKeys.forEach(key => {
            if(
              key === 'taskId'
              || key === 'execList'
            ) {
              throw new MyError({code: 1, msg: `不允许直接修改 ${key} 字段`})
            }
            if(
              key === 'taskName'
              && (
                newTaskList.length > 1
                || taskList.some(taskItem => taskItem.taskName === set.taskName)
              )
            ) {
              throw new MyError({code: 2, msg: `不能修改为多个相同的 ${key}`})
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

  if(taskStart) {
    let {taskId} = await taskFn.get(taskStart)
    console.log('taskId', taskId)
    if(taskId !== undefined) {
      taskFn.start(taskId)
    } else {
      print(`没有找到任务 ${taskStart}`)
    }
  }
}
