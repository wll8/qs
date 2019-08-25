#!/usr/bin/env node
// -- init global var --
global.QS = { // 把一些经常用到的方法保存到全局, 避免多次初始化影响性能, 不使用到的尽量不初始化
  QS_PATH: function (addr) {
    const {normalize, resolve} = require('path')
    addr = [__dirname].concat(Array.isArray(addr) ? addr : [addr])
    return normalize(resolve(...addr))
  }
}
// -- init global var --

let RUN // 运行方法
const QS_PATH = global.QS.QS_PATH // 获取相对于 qs 的路径

const fs = require('fs')
const child_process = require('child_process')
const {
  nodeBin,
  cfg,
  hasModules,
  dateFormater,
} = require(QS_PATH('./util/index.js'))

const [ARG1, ...ARG_MORE] = process.argv.slice(2)

;(async () => {

  { // 初始化运行方法
    const Run = require(QS_PATH('./util/run.js'))
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
      const Task = require(QS_PATH('./util/task.js'))
      global.QS.TASK = await new Task()
      const TASK = QS.TASK
      await TASK.saveProcess()
    }
  }

  program
    .version(require(QS_PATH('./package')).version)
    .usage('<command> [options]')

  program
    .command('tp')
    .description('Select a template to create a project')
    .option('-n, --name <taskName>', 'Task Name, No repetition allowed')
    .option('-t, --template <templateName>', 'Template type')
    .option('--openDir', 'Open the directory')
    .option('-d, --directory <directoryName>', 'Specify folders (default: "{dataDir}/{template}__{dateFormater}/")')
    .option('-f, --fileName [fileName]', 'Specify a filename, Select template automatically according to suffix', 'index.js')
    .option('-m, --module <moduleName,moduleName2...>', 'Add and automatically install dependencies, separating multiple with commas', list) // 如果是浏览器环境, 则从 cdn 查找并引用
    .option('--es5 [config]', 'Save and convert to Es5 file')
    .option('--local', '保存 cdn 到本地')
    .action((arg) => {
      const argRes = cleanArgs(arg)
      argRes.template ? require(QS_PATH('./core/tp.js'))(argRes) : arg.outputHelp()
    })

  program
    .command('html')
    .action(async (arg) => {
      const shelljs = require('shelljs')
      // const html = fs.readFileSync(QS_PATH('./template/html/html.html')).toString()
      const date = dateFormater('YYYYMMDDHHmmss', new Date())
      const dataDir = `${cfg.get().dataDir}/${date}/`
      shelljs.mkdir('-p', dataDir)
      shelljs.cp('-r', QS_PATH('./template/html/*'), dataDir)
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
      cleanArgs(arg, require(QS_PATH('./core/admin.js'))) || arg.outputHelp()
    })

  program
    .command('init')
    .description('Initializer')
    .option('-e, --extend', 'Function of Initialization Extendsion')
    .option('-o, --other', 'Initialize other functions')
    .action((arg) => {
      cleanArgs(arg, require(QS_PATH('./core/init.js')))
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
        hasModules(`./extend/${ARG1}/`) ? require(QS_PATH(extendFile)) : console.log('qs init -e')
      } else { // other function
        hasModules('./other/') ? require(QS_PATH('./other/index.js'))({arg1: ARG1, argMore: ARG_MORE}) : console.log('qs init -o')
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

