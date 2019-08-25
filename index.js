#!/usr/bin/env node
// -- init global var --
global.QS = { // 把一些经常用到的方法保存到全局, 避免多次初始化影响性能, 不使用到的尽量不初始化
  SRC: __dirname,
}
// -- init global var --

let RUN // 运行方法

const fs = require('fs')
const path = require('path')
const child_process = require('child_process')
const {
  qsPath,
  nodeBin,
  cfg,
  hasModules,
  dateFormater,
} = require('./util/index.js')

const [ARG1, ...ARG_MORE] = process.argv.slice(2)

;(async () => {

  { // 初始化运行方法
    const Run = require('./util/run.js')
    global.QS.RUN = await new Run()
    RUN = global.QS.RUN
  }

  let {moduleManage} = cfg.get()
  if(!moduleManage) { // 判断应该使用什么包处理器
    moduleManage = ((await RUN.execAsync('cnpm -v')).error ? 'npm' : 'cnpm')
    cfg.set('moduleManage', moduleManage)
  }

  { // 初始化数据保存目录
    const os = require('os')
    let {dataDir} = cfg.get()
    if(!dataDir) {
      dataDir = `${os.homedir()}/.qs/`
      cfg.set('dataDir', dataDir)
    }
  }

  // 初始化命令
  if( (ARG1 === 'init') && !ARG_MORE.length && !hasModules('./') ) {
    await RUN.execFileSync(`${moduleManage} i`)
  }

  // 判断 qs 依赖目录是否存在, 不存在则提示需要初始化
  if(!hasModules('./')) {
    console.log('qs init')
    return
  }

  // -------------- start

  const program = require('commander')

  {
    if( // 记录任务的条件
      ARG1 // 存在参数
      && !ARG1.match(/^-/) // 这个参数不是选项
      && !['init', 'admin'].includes(ARG1) // 不包含这些参数
    ) {
      const Task = require('./task.js')
      global.QS.TASK = await new Task()
      const TASK = QS.TASK
      await TASK.saveProcess()
    }
  }

  program
    .version(require('./package').version)
    .usage('<command> [options]')

  program
    .command('js')
    .description('Creating JS type applications')
    .option('--openDir', 'Open the directory')
    .option('-d, --directory [directoryName]', 'Specify folders', '.')
    .option('-f, --fileName [fileName]', 'Specify a filename, Select template automatically according to suffix', 'index.js')
    .option('--es5 [config]', 'Save and convert to Es5 file')
    .option('-m, --module <moduleName,moduleName2...>', 'Add and automatically install dependencies, separating multiple with commas', list)
    .action((arg) => {
      const js = require('./core/js.js')
      cleanArgs(arg, js)
    })

  program
    .command('html')
    .action(async (arg) => {
      const shelljs = require('shelljs')
      // const html = fs.readFileSync(qsPath('./template/html/html.html')).toString()
      const date = dateFormater('YYYYMMDDHHmmss', new Date())
      const dataDir = `${cfg.get().dataDir}/${date}/`
      shelljs.mkdir('-p', dataDir)
      shelljs.cp('-r', qsPath('./template/html/*'), dataDir)
      shelljs.exec(`code ${dataDir}`)
      await RUN.execFileSync(`${nodeBin('browser-sync', './')} start --no-notify --server --files '**/**'`, dataDir)
      console.log('html', dataDir)
    })

  program
    .command('admin')
    .description('admin')
    .option('-c --config <key[=val]>', 'View or change configuration')
    .option('--resetConfig', 'Reset to default configuration')
    .option('--deleteNodeModouse', 'Delete all node_modules')
    .option('-t --task [cmd[=arg]]', '管理通过 qs 创建的任务列表')
    .action((arg) => {
      cleanArgs(arg, require('./admin.js')) || arg.outputHelp()
    })

  program
    .command('init')
    .description('Initializer')
    .option('-e, --extend', 'Function of Initialization Extendsion')
    .option('-o, --other', 'Initialize other functions')
    .action((arg) => {
      cleanArgs(arg, require('./init.js'))
    })

  program.on('--help', () => {
    console.log()
    console.log(`  Run qs <command> --help for detailed usage of given command.`)
    console.log()
  })

  program
    .command('*')
    .description('More features')
    .action(async function(){
      const extendFile = {
        ss: './extend/ss/ss.js',
      }[ARG1]
      if(extendFile) { // extend function
        hasModules(`./extend/${ARG1}/`) ? require(qsPath(extendFile)) : console.log('qs init -e')
      } else { // other function
        hasModules('./other/') ? require(qsPath('./other/index.js'))({arg1: ARG1, argMore: ARG_MORE}) : console.log('qs init -o')
      }

    })

  program.parse(process.argv)

  if (ARG1 === undefined) {
    program.outputHelp()
  }

})();

function cleanArgs (obj, cb) { // Options for paraing user input
  const args = {}
  obj.options && obj.options.forEach(o => {
    const long = o.long.replace(/^--/, '')
    const key = long.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
    if (typeof obj[key] !== 'function' && typeof obj[key] !== 'undefined') {
      args[long] = obj[key]
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

