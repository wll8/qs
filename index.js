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
  } = global.qs

  // 初始化命令
  if( (arg1 === 'init') && !argMore.length && !hasModules('./') ) {
    await run.execFileSync(`${moduleManage} i`)
    return
  }

  // 判断 qs 依赖目录是否存在, 不存在则提示需要初始化
  if(!hasModules('./')) {
    print('qs init')
    return
  }

  // -------------- start

  const program = require('commander')

  {
    if( // 记录任务的条件
      arg1 // 存在参数
      && !arg1.match(/^-/) // 这个参数不是选项
      && !['init', 'admin'].includes(arg1) // 不包含这些参数
    ) {
      const Task = require(qsPath('./util/task.js'))
      const task = await new Task()
      global.qs.task = task
      await task.saveProcess()
    }
  }

  program
    .version(require(qsPath('./package')).version , '-v, --vers', 'output the current version')
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
      argRes.template ? require(qsPath('./core/tp.js'))(argRes) : arg.outputHelp()
    })

  program
    .command('html')
    .action(async (arg) => {
      const shelljs = require('shelljs')
      const date = dateFormater('YYYYMMDDHHmmss', new Date())
      const dataDirDate = `${dataDir}/${date}/`
      shelljs.mkdir('-p', dataDirDate)
      shelljs.cp('-r', qsPath('./template/html/*'), dataDirDate)
      shelljs.exec(`code ${dataDirDate}`)
      await run.execFileSync(`node ${nodeBin('browser-sync', './')} start --no-notify --server --files "**/**"`, dataDirDate)
    })

  program
    .command('vue')
    .action(async (arg) => {
      const shelljs = require('shelljs')
      const date = dateFormater('YYYYMMDDHHmmss', new Date())
      const dataDirDate = `${dataDir}/${date}/`
      shelljs.mkdir('-p', dataDirDate)
      shelljs.cp('-r', qsPath('./template/vue/*'), dataDirDate)
      shelljs.exec(`code ${dataDirDate}`)
      await run.execFileSync(`node ${nodeBin('browser-sync', './')} start --no-notify --server --files "**/**"`, dataDirDate)
    })

  program
    .command('admin')
    .description('admin')
    .option('-c --config <key[=val]>', 'View or change configuration')
    .option('--resetConfig', 'Reset to default configuration')
    .option('--deleteNodeModouse', 'Delete all node_modules')
    .option('-t --task [cmd[=arg]]', '管理通过 qs 创建的任务列表')
    .action((arg) => {
      cleanArgs(arg, require(qsPath('./core/admin.js'))) || arg.outputHelp()
    })

  program
    .command('init')
    .description('Initializer')
    .option('-e, --extend', 'Function of Initialization Extendsion')
    .option('-o, --other', 'Initialize other functions')
    .action((arg) => {
      cleanArgs(arg, require(qsPath('./core/init.js')))
    })

  program.on('--help', () => {
    print()
    print(`  Run qs <command> --help for detailed usage of given command.`)
    print()
  })

  program
    .command('*')
    .description('More features')
    .action(async function(){
      const extendFile = {
        ss: './extend/ss/ss.js',
      }[arg1]
      if(extendFile) { // extend function
        hasModules(`./extend/${arg1}/`) ? require(qsPath(extendFile)) : print('qs init -e')
      } else { // other function
        hasModules('./other/') ? require(qsPath('./other/index.js'))({arg1: arg1, argMore: argMore}) : print('qs init -o')
      }

    })

  program.parse(process.argv)

  if (arg1 === undefined) {
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

async function globalInit() { // 把一些经常用到的方法保存到全局, 避免多次初始化影响性能, 不使用到的尽量不初始化
  const [arg1, ...argMore] = process.argv.slice(2)
  const util = await require('./util/index.js')()
  const qs = Object.create({}, {
    arg1: {value: arg1},
    argMore: {value: argMore},
    util: {value: {
      ...util,
      run: await new (require(util.qsPath('./util/run.js')))({
        execAsync: util.execAsync,
        execFileSync: util.execFileSync,
        spawnWrap: util.spawnWrap,
      }),
    }},
  })
  await initCfg()
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
