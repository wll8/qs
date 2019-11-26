#!/usr/bin/env node

if(module.parent) { // 如果是其他程序调用, 则导出方法给其他程序
  const extendArgv = process.argv
  const qsExports = new Promise(async (res, rej) => {
    async function listener({argv, pid}) {
      process.argv = argv
      let globalInitRes = await globalInit({argv, pid})
      process.argv = extendArgv
      process.removeListener('message', listener) // 收到数据后, 取消监听
      res(globalInitRes)
    }
    process.on('message', listener);

  })
  module.exports = qsExports
  return
}

new Promise(async () => {
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
    binArg1,
    binArgMore,
    rawArg1,
    rawArgMore,
    argParse,
    task,
    pid,
    argParse: {
      taskAdd,
      taskStart,
    },
  } = global.qs

  await require(qsPath('./option.js'))()
  if(binArg1 && !taskStart) {
    const defaultArg = [{cwd: process.cwd()}]
    const bin = nodeBinNoMainPackage(binArg1)
    if(bin) { // 扩展功能, 运行 extend 目录中的程序
      await autoInstallPackage(bin)
      const exer = getExer(bin)
      await run.spawnWrap([...exer, ...binArgMore], [
        {
          ...defaultArg[0],
          stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        },
        {
          send: {
            argv: process.argv,
            pid: pid,
          },
        }
      ], taskAdd)
    } else { // 第三方功能, 运行 outside 目录中的程序, 顺序: file > package.json > system
      const isWindows = require('os').type() === 'Windows_NT'
      // 添加环境变量, 让系统可以找到 outside 目录中的程序, win 下的分隔符是 ; 类 unix 是 : .
      process.env.PATH = `${qsPath('./outside/')}${isWindows ? ';' : ':'}${process.env.PATH}`

      { // 运行文件程序
        if(isWindows === false) {
          // 不是 windows 时才需要处理文件全路径匹配
          // -- win 上有 PATHEXT 系统变量可以直接运行相关后缀的脚本, 比如 a.bat 的 .bat 后缀在列表中, 就可以直接使用 `a` 运行.
          // -- linux 上 a.sh 必须匹配全路径, 即使添加程序所在目录到环境变量中, 也只能使用 `a.sh` 运行.
          const binFile = qsPath(`./outside/${binArg1}.sh`)
          if(hasFile(binFile)) {
            await run.spawnWrap(['sh', [binFile, ...binArgMore]], defaultArg, taskAdd)
            process.exit()
          }
        }
      }

      { // 运行 package.dependencies 中的程序
        const package = qsPath('./outside/package.json')
        const hasDependencies = hasFile(package) && require(package).dependencies
        const hasNodeModules = hasFile('./outside/node_modules')
        if(hasDependencies && hasNodeModules) {
          const nodeBinFile = nodeBin(binArg1)
          if(nodeBinFile) {
            await runNodeBin({nodeBinFile, binArgMore, arg: defaultArg})
            process.exit()
          }
        }
        if(hasDependencies && (hasNodeModules === false)) {
          print('你存在 package.dependencies 但是没有进行安装, 尝试 `qs --install outside package.dependencies`')
        }
      }

      { // 移交命令和参数给系统, 让系统去执行, 例 `qs echo 123`
        await run.spawnWrap([binArg1, ...binArgMore], defaultArg, taskAdd)
        process.exit()
      }
    }
  }

})

async function initUtil() {
  let util = await require('./util/index.js')()
  util.run = await new (require(util.qsPath('./util/run.js')))({
    execAsync: util.execAsync,
    execFileSync: util.execFileSync,
    spawnWrap: util.spawnWrap,
  })
  return util
}

async function autoInstallPackage (bin) {
  // 如果扩展目录存在 package.json 且存在 dependencies 但没有 node_modules 时, 自动安装依赖
  const {
    util: {
      run,
      hasFile,
      cfg,
      qsPath,
    },
  } = global.qs
  let extendPath = qsPath('./extend')
  let re =  new RegExp(`${extendPath}/(.*?)/`)
  let dirName = (bin.match(re) || [])[1]
  if(dirName) {
    let package = extendPath + '/' + dirName + '/package.json'
    let node_modules = extendPath + '/' + dirName + '/node_modules'

    if(hasFile(package) && require(package).dependencies && !hasFile(node_modules)) { // 自动安装依赖
      let cmd = `${cfg.get('moduleManage')} i --production`
      await run.spawnWrap(cmd, [{cwd: qsPath(extendPath + '/' + dirName)}])
    }
  }
}

async function runNodeBin ({nodeBinFile, binArgMore, arg = []}) {
  const {
    util: {
      print,
      run,
    },
    argParse: {
      taskAdd,
    },
  } = global.qs
  const exer = getExer(nodeBinFile)

  // 不优雅的判断管道判断
  const chunk = await new Promise((resolve, reject) => {
    process.stdin.on('data', chunk => {
      resolve(String(chunk))
    })
    setTimeout(() => resolve(undefined), 10)
  })
  if(chunk) { // 管道内容
    const argStr = binArgMore.map(item => `'${item}'`).join(' ')
    const cmd = `echo '${chunk.replace(/\n/g, "")}' | ${exer.join(' ')} ${argStr}`
    const {error, stdout, stderr} = await run.execAsync(cmd, arg, taskAdd)
    print(stdout)
  } else {
    await run.execFileSync([...exer, ...binArgMore], arg, taskAdd)
    process.exit()
  }
}

function getExer(file) { // 获取执行器, 返回 [file] 或 [exer, file]
  // 如果是二进制, 直接运行; 如果是文本, 则判断使用 `#!`; 如果是文本且没有 `#!`, 则使用系统运
  const {
    util: {
      qsPath
    },
  } = global.qs
  const isBinaryFile = require(qsPath('./lib/isBinaryFile.js')).isBinaryFileSync(file)
  const arr = isBinaryFile ? [file] : [
    file.match(/.js$/) ? 'node' : '',
    file,
  ].filter(item => item.trim())
  return arr

}

async function initArgs ({util, argv}) {
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

async function globalInit(init) { // 把一些经常用到的方法保存到全局, 避免多次初始化影响性能, 不使用到的尽量不初始化
  const {pid = process.pid, argv = process.argv} = init || {}
  let util = await initUtil()
  let {
    argParse,
    binArg1,
    rawArg1,
    binArgMore,
    rawArgMore,
  } = await initArgs({util, argv})
  let task = await initTask()
  const qs = (() =>  {// 设置对象的 key 为只读
    let qs = {
      binArg1,
      rawArg1,
      argParse,
      binArgMore,
      rawArgMore,
      util,
      task,
      pid,
    }
    // Object.keys(qs).forEach(key => qs[key] = {value: qs[key]})
    // return Object.create({}, qs)
    return qs
  })();

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
      const Task = require(qsPath('./util/task.js'))({argParse, util, pid, binArg1})
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
    { // userDataDir 初始化数据保存目录
      const os = require('os')
      let {userDataDir} = util.cfg.get()
      if(!userDataDir) {
        userDataDir = `${os.homedir()}/.qs/userData/`
        util.cfg.set('userDataDir', userDataDir)
      }
    }
  }
  return qs
}
