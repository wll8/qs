async function initUtil() {
  let util = await require(`${__dirname}/index.js`)()
  util.run = await new (require(util.qsPath('./util/run.js')))({
    execAsync: util.execAsync,
    spawnWrap: util.spawnWrap,
  })
  return util
}

async function initCfg({cfg, qsPath, execAsync, configReset}) {
  const os = require('os')
  {
    let {moduleManage, userDataDir, taskRecord} = cfg.get()
    if(configReset || (moduleManage === undefined)) { // moduleManage 包管理工具
      moduleManage = ((await execAsync('cnpm -v')).error ? 'npm' : 'cnpm')
      cfg.set('moduleManage', moduleManage)
    }
    if(configReset || (userDataDir === undefined)) { // userDataDir 初始化数据保存目录
      userDataDir = qsPath(`${os.homedir()}/.qs/userData/`)
      cfg.set('userDataDir', userDataDir)
    }
    if(configReset || (taskRecord === undefined)) { // taskRecord 任务保存数量
      cfg.set('taskRecord', 99)
    }
  }
}

async function initTask({util, pid, argParse, binArg1}) {
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
    const Task = require(qsPath('./util/task.js'))({argParse, util, pid, binArg1})
    taskFn = await new Task()
  }
  return taskFn
}

function initFile() {
  // 初始化 qs 会用到的目录和文件
  const os = require('os')
  const fs = require('fs')
  const qsPath = require(`${__dirname}/qsPath.js`)
  const hasFile = require(`${__dirname}/hasFile.js`)

  const qsDataDir = qsPath(`${os.homedir()}/.qs/`)
  const qsExtendDir = qsPath(`${qsDataDir}/extend/`)
  const qsOutsideDir = qsPath(`${qsDataDir}/outside/`)
  const qsConfigPath = qsPath(`${qsDataDir}/config.json`)
  const qsTaskPath = qsPath(`${qsDataDir}/task.json`)

  !hasFile(qsDataDir) && fs.mkdirSync(qsDataDir)
  !hasFile(qsExtendDir) && fs.mkdirSync(qsExtendDir)
  !hasFile(qsOutsideDir) && fs.mkdirSync(qsOutsideDir)
  !hasFile(qsConfigPath) && fs.writeFileSync(qsConfigPath, '{}')
  !hasFile(qsTaskPath) && fs.writeFileSync(qsTaskPath, '[]')
  return {
    qsDataDir,
    qsConfigPath,
    qsTaskPath,
    qsExtendDir,
    qsOutsideDir,
  }
}

async function initArg ({util, argv}) {
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
      .version(false)
      .option({
        'v': {
          alias: ['vers', 'version'],
          describe: '显示版本号',
          type: 'boolean',
        },
        'h': {
          alias: 'help',
          type: 'boolean',
        },
        'r': {
          alias: 'raw-cmd',
          describe: '以原始命令运行, 避免存储任务时变量被解析',
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
        'task-show-id': {
          describe: '输出当前任务id',
          type: 'boolean',
        },
        'config': {
          describe: '查看、修改配置 [k[=v]]',
          type: 'string',
        },
        'config-reset': {
          describe: '重置配置',
          type: 'boolean',
        },
      })
      .conflicts('explicit', 'regexp') // 互斥
      // .implies('n', { // todo 隐含
      //   a: true,
      // })
      .argv
      if(argParse.version) { // 输出版本, 并退出程序
        print(require(qsPath('./package.json')).version)
        process.exit()
      }
      if((argParse.taskName || argParse.taskDes)) {
        argParse.taskAdd = true
      }
      return {argParse, yargs}
    }
    const {argParse, yargs} = getArgs()
    let [binArg1, ...binArgMore] = argParse.rawCmd ? handleRaw(argParse.rawCmd) : argParse._
    let [rawArg1, ...rawArgMore] = argv.slice(2)
    if(!rawArg1) { // 没有任何参数时显示帮助
      yargs.showHelp(str => print(str))
    } else {
      resolve({argParse, binArg1, binArgMore, rawArg1, rawArgMore})
    }
  })
}

module.exports = {
  initArg,
  initUtil,
  initTask,
  initCfg,
  initFile,
}
