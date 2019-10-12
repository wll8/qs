#!/usr/bin/env node

;(async () => {
  global.qs = await globalInit()
  const {
    util: {
      print,
      run,
      nodeBin,
      cfg: {
        get: {
          moduleManage,
          dataDir,
        }
      },
      hasModules,
      dateFormater,
      qsPath,
    },
    arg1,
    argMore,
    argParse: {
      taskName,
      taskAdd,
    },
  } = global.qs

  {
    // console.log('argParse', {taskName, argMore, arg1})
    if(/^-/.test(arg1)) { // 没有可运行的命令
      return
    }

    const extendFile = {
      ss: './extend/ss/ss.js',
    }[arg1]
    if(extendFile) { // extend function
      hasModules(`./extend/${arg1}/`) ? require(qsPath(extendFile)) : print('qs init -e')
    } else { // other function
      hasModules('./other/') ? require(qsPath('./other/index.js'))({ arg1, argMore }) : print('qs init -o')
    }
  }

})();

async function initArgs ({util}) {
  const {
    qsPath,
    print,
  } = util
  return new Promise((resolve, reject) => {
    const program = require('commander')
    program.unknownOption = () => {} // 避免 `qs ls -l` 出现 `error: unknown option '-l'`
    let arg1 = ''
    let argMore = []

    program
      .version(require(qsPath('./package')).version , '-v, --vers', '显示当前版本')
      .helpOption('-h, --help', '显示帮助')
      .option('--explicit', '查找任务时使用精确匹配')
      .option('--regexp', '查找任务时使用正则匹配', true)
      .option('--task [kv...]', '显示或查找、修改任务')
      .option('-a, --task-add', '添加到任务记录')
      .option('-n, --task-name <name>', '添加任务记录并创建任务名称, 包含 -a')
      .option('-d, --task-des <info>', '添加任务记录并创建任务描述, 包含 -a')
      .option('-s, --task-start <id|name>', '启动任务')
      .option('-k, --task-kill <id|name>', '停止任务')
      .option('--task-remove <id|name>', '删除任务')
      .option('--config [kv...]', '显示或查找、修改配置')
      .option('--config-reset', '重置配置')
      .option('--node-modules-remove', '删除 qs 中的 node_modules')
      .option('--init', '初始化 qs, 不包含命令')
      .option('--init-extend', '初始化默认的扩展命令, 如 tp')
      .option('--init-outside', '初始化默认的外部命令, 如 ssh')
      .action(async arg => {
        const argParse = cleanArgs(arg) || {}
        let {taskAdd, taskName} = argParse
        let [rawArg1, ...rawArgMore] = process.argv.slice(2)
        if((rawArg1 === '-n') || (rawArg1 === '--task-name')) {
          taskAdd = true
          taskName = rawArgMore[0]
          arg1 = rawArgMore[1]
          argMore = rawArgMore.slice(2)
        }
        if((rawArg1 === '-a') || (rawArg1 === '--task-add')) {
          taskAdd = true
          taskName = undefined
          arg1 = rawArgMore[0]
          argMore = rawArgMore.slice(1)
        }
        arg1 = arg1 || rawArg1
        argMore = /^-/.test(rawArg1) ? argMore : rawArgMore // 如果第一个参数直接是命令的时候
        argParse.taskName = taskName
        argParse.taskAdd = taskAdd
        resolve({argParse, arg1, argMore, rawArg1, rawArgMore})
      })

    if(!process.argv[2]) {
      program.outputHelp(txt => txt)
      process.exit()
    }
    program.parse(process.argv)
  })
}

function cleanArgs (obj, cb) { // Options for paraing user input
  const args = {}
  obj.options && obj.options.forEach(o => {
    const long = o.long.replace(/^--/, '')
    const key = long.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
    if (typeof obj[key] !== 'function' && typeof obj[key] !== 'undefined') {
      // args[long] = obj[key]
      args[key] = obj[key]
    }
  })
  if(JSON.stringify(args) !== '{}') {
    cb && cb(args)
    return args
  } else {
    return undefined
  }
}

function list(val) {
  return val.split(',').filter(item => item)
}

async function globalInit() { // 把一些经常用到的方法保存到全局, 避免多次初始化影响性能, 不使用到的尽量不初始化
  let util = await require('./util/index.js')()
  util.run = await new (require(util.qsPath('./util/run.js')))({
    execAsync: util.execAsync,
    execFileSync: util.execFileSync,
    spawnWrap: util.spawnWrap,
  })
  let {
    argParse,
    arg1,
    rawArg1,
    argMore,
    rawArgMore,
  } = await initArgs({util})
  let task = await initTask()
  const qs = Object.create({}, {
    arg1: {value: arg1},
    rawArg1: {value: rawArg1},
    argParse: {value: argParse},
    argMore: {value: argMore},
    rawArgMore: {value: rawArgMore},
    util: {value: util},
    task: {value: task},
  })
  await initCfg()

  async function initTask() {
    const {
      taskAdd,
      task,
      explicit,
      regexp,
    } = argParse
    const {
      print,
      qsPath,
    } = util
    let taskFn
    if(taskAdd || task) {
      const Task = require(qsPath('./util/task.js'))({argParse, util, arg1})
      taskFn = await new Task()
      if(taskAdd) { // 初始化保存任务
        await taskFn.saveProcess() // 保存当前运行的进程信息再补充参数
      }
      await taskFn.updateList()
    }
    if(task === true) {
      const taskList = await taskFn.get()
      taskList.forEach(item => {delete item.ppid; delete item.uid})
      print(taskList)
    }
    if(task && typeof(task) === 'string') { // 任务的查询及修改
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
    return taskFn
  }
  async function initCfg() {
    { // moduleManage 包管理工具
      let {moduleManage} = util.cfg.get
      if(!moduleManage) { // 判断应该使用什么包管理工具
        moduleManage = ((await qs.util.run.execAsync('cnpm -v')).error ? 'npm' : 'cnpm')
        util.cfg.set('moduleManage', moduleManage)
      }
    }
    { // dataDir 初始化数据保存目录
      const os = require('os')
      let {dataDir} = util.cfg.get
      if(!dataDir) {
        dataDir = `${os.homedir()}/.qs/`
        util.cfg.set('dataDir', dataDir)
      }
    }
  }
  return qs
}
