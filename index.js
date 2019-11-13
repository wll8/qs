#!/usr/bin/env node

;(async () => {
  global.qs = await globalInit()
  const {
    util: {
      print,
      run,
      hasFile,
      nodeBin,
      nodeBinNoMainPackage,
      cfg,
      dateFormater,
      qsPath,
    },
    arg1,
    argMore,
    argParse: {
      taskAdd,
      taskStart,
    },
  } = global.qs

  {
    await require(qsPath('./core/option.js'))()
    if(arg1 && !taskStart) {
      const bin = nodeBinNoMainPackage(arg1)
      if(bin) { // 扩展功能, 运行 extend 目录中的程序
        { // 如果扩展目录存在 package.json 且存在 dependencies 但没有 node_modules 时, 自动安装依赖
          let extendPath = qsPath('./extend')
          let re =  new RegExp(`${extendPath}/(.*?)/`)
          let dirName = (bin.match(re) || [])[1]
          if(dirName) {
            let package = extendPath + '/' + dirName + '/package.json'
            let node_modules = extendPath + '/' + dirName + '/node_modules'

            if(hasFile(package) && require(package).dependencies && !hasFile(node_modules)) {
              let cmd = `${cfg.get('moduleManage')} i --production`
              await run.spawnWrap(cmd, [{cwd: qsPath(extendPath + '/' + dirName)}])
            }
          }
        }
        await run.spawnWrap(['node', bin, ...argMore], [{cwd: process.cwd()}], taskAdd)
      } else { // 第三方功能, 运行 outside 目录中的程序, 顺序: package.json > exelist.json > system
        hasFile('./other/node_modules') ? require(qsPath('./other/index.js'))({ arg1, argMore, arg: [{cwd: process.cwd()}] }) : print('qs init -o')
      }
    }

  }

})();

async function initArgs ({util}) {
  const {
    qsPath,
    print,
    handleRaw,
  } = util
  return new Promise((resolve, reject) => {
    function getArgs() {
      const yargs = require('yargs')
      const argParse = yargs
      .parserConfiguration({
        // 'short-option-groups': false, // 是否合并短参数为数组
        'halt-at-non-option': true, // 在第一个位置参数(不可解析的)处停止解析
        'strip-dashed': true, // 删除虚线值
      })
      .option({
        'v': {
          alias: ['vers', 'version'],
          type: 'boolean',
        },
        'h': {
          alias: 'help',
          type: 'boolean',
        },
        'r': {
          alias: 'raw-cmd',
          describe: '以字符串形式运行, 避免存储记录时变量、通配符被解析',
          type: 'array',
        },
        'explicit': {
          describe: '查找任务时使用精确匹配',
          type: 'boolean',
        },
        'regexp': {
          describe: '查找任务时使用正则匹配',
          type: 'boolean',
          default: true,
        },
        'task': {
          describe: '显示或查找、修改任务 [kv...]',
          type: 'array',
        },
        'a': {
          alias: 'task-add',
          describe: '添加到任务记录',
          type: 'boolean',
        },
        'n': {
          alias: 'task-name',
          describe: '添加任务记录并创建任务名称, 隐含 -a',
          type: 'string',
        },
        'd': {
          alias: 'task-des',
          describe: '添加任务记录并创建任务描述, 隐含 -a',
          type: 'string',
        },
        's': {
          alias: 'task-start',
          describe: '启动任务 <id|name>',
          type: 'string',
        },
        'k': {
          alias: 'task-kill',
          describe: '停止任务 <id|name>',
          type: 'string',
        },
        'task-remove': {
          describe: '删除任务 <id|name>',
          type: 'string',
        },
        'config': {
          describe: '查看、修改配置 [k[=v]]',
          type: 'string',
        },
        'config-reset': {
          describe: '重置配置',
          type: 'boolean',
        },
        'node-modules-remove': {
          describe: '删除 qs 中的 node_modules',
          type: 'boolean',
        },
        'init': {
          describe: '初始化 qs, 不包含命令',
          type: 'boolean',
        },
        'init-extend': {
          describe: '初始化默认的扩展命令, 如 tp',
          type: 'boolean',
        },
        'init-outside': {
          describe: '初始化默认的外部命令, 如 ssh',
          type: 'boolean',
        },
      })
      .conflicts('explicit', 'regexp') // 互斥
      // .implies('n', { // todo 隐含
      //   a: true,
      // })
      .argv
      if((argParse.taskName || argParse.taskDes)) {
        argParse.taskAdd = true
      }
      return {argParse, yargs}
    }
    const {argParse, yargs} = getArgs()
    let [arg1, ...argMore] = argParse.rawCmd ? handleRaw(argParse.rawCmd) : argParse._
    let [rawArg1, ...rawArgMore] = process.argv.slice(2)
    if(!rawArg1) { // 没有任何参数时显示帮助
      yargs.showHelp(str => print(str))
    } else {
      resolve({argParse, arg1, argMore, rawArg1, rawArgMore})
    }
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
      task,
      taskAdd,
      taskName,
      taskDes,
      taskStart,
      taskKill,
      taskRemove,
      explicit,
      regexp,
    } = argParse
    const {
      print,
      qsPath,
    } = util
    let taskFn
    if( // 如果与 task 相关的参数存在, 则初始化 task
      [
        task,
        taskAdd,
        taskName,
        taskDes,
        taskStart,
        taskKill,
        taskRemove,
      ].filter(item => item !== undefined).length
    ) {
      const Task = require(qsPath('./util/task.js'))({argParse, util, arg1})
      taskFn = await new Task()
    }
    return taskFn
  }
  async function initCfg() {
    { // moduleManage 包管理工具
      let {moduleManage} = util.cfg.get()
      if(!moduleManage) { // 判断应该使用什么包管理工具
        moduleManage = ((await qs.util.run.execAsync('cnpm -v')).error ? 'npm' : 'cnpm')
        util.cfg.set('moduleManage', moduleManage)
      }
    }
    { // dataDir 初始化数据保存目录
      const os = require('os')
      let {dataDir} = util.cfg.get()
      if(!dataDir) {
        dataDir = `${os.homedir()}/.qs/`
        util.cfg.set('dataDir', dataDir)
      }
    }
  }
  return qs
}
