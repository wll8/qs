async function initUtil() {
  let util = await require(`${__dirname}/index.js`)()
  util.run = await new (require(util.qsPath('./util/run.js')))({
    execWrap: util.execWrap,
    spawnWrap: util.spawnWrap,
  })
  return util
}

async function initCfg({cfg, qsPath, execWrap, configReset}) {
  const os = require('os')
  {
    let {moduleManage, userDataDir, taskRecord, exer} = cfg.get()
    if(configReset || (moduleManage === undefined)) { // moduleManage 包管理工具
      moduleManage = ((await execWrap('cnpm -v')).error ? 'npm' : 'cnpm')
      cfg.set('moduleManage', moduleManage)
    }
    if(configReset || (userDataDir === undefined)) { // userDataDir 初始化数据保存目录
      userDataDir = qsPath(`${os.homedir()}/.qs/userData/`)
      cfg.set('userDataDir', userDataDir)
    }
    if(configReset || (taskRecord === undefined)) { // taskRecord 任务保存数量
      cfg.set('taskRecord', 99)
    }
    if(configReset || (exer === undefined)) { // exer 脚本解释器配置
      cfg.set(
        'exer',
        [
          {
            ext: ['.sh'],
            exer: 'sh',
          },
          {
            ext: ['.js'],
            exer: 'node',
          },
          {
            ext: ['.py', '.pyc'],
            exer: 'python',
          },
          {
            ext: ['.java'],
            exer: 'java',
            template: 'javac ${main} && ${exer} ${exerArg} ${main.removeSuffix} ${mainArg}',
          },
        ]
      )
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
  const qsExtendDir = qsPath(`${qsDataDir}/ext/`)
  const qsConfigPath = qsPath(`${qsDataDir}/config.json`)
  const qsTaskPath = qsPath(`${qsDataDir}/task.json`)

  !hasFile(qsDataDir) && fs.mkdirSync(qsDataDir)
  !hasFile(qsExtendDir) && fs.mkdirSync(qsExtendDir)
  !hasFile(qsConfigPath) && fs.writeFileSync(qsConfigPath, '{}')
  !hasFile(qsTaskPath) && fs.writeFileSync(qsTaskPath, '[]')
  return {
    qsDataDir,
    qsConfigPath,
    qsTaskPath,
    qsExtendDir,
  }
}

/**
 *
 * @param {object} param0.util - util 对象
 * @param {object} param0.argv - process.argv 对象
 */
async function initArg ({util, argv}) {
  const {
    qsPath,
    shelljs,
    print,
    handleRaw,
  } = util
  return new Promise((resolve, reject) => {
    if (argv.length > 2 && argv[2][0] !== '-') {
      let [rawArg1, ...rawArgMore] = argv.slice(2)
      const res = {
        argParse: {},
        binArg1: rawArg1,
        binArgMore: rawArgMore,
        rawArg1,
        rawArgMore,
      }
      return resolve(res)
    }

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
        'exer-arg': {
          describe: '设置解释器启动参数',
          type: 'string',
        },
        'which': {
          describe: '输出命令所在路径',
          type: 'string',
        },
        'o': {
          alias: 'open',
          describe: '打开 qs 中的文件或目录',
          type: 'string',
        },
      })
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
      const version = require(qsPath('./package.json')).version
      yargs.showHelp(str => print(
        require('fs').readFileSync(qsPath('./util/qsText.txt'), 'utf8')
        .replace(/( -- v)(\d+\.\d+\.\d+)/, `$1${version}`)
        + `\r\n${str}\r\n`
      ))
    } else {
      const res = {argParse, binArg1, binArgMore, rawArg1, rawArgMore}
      return resolve(res)
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
