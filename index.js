#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const child_process = require('child_process')
const {
  execFileSync,
  pathAbs,
  nodeBin,
  cfg,
  hasModules,
  execAsync,
} = require('./util.js')

;(async () => {
  const moduleManage =  cfg.get().moduleManage || ((await execAsync('cnpm -v')).error ? 'npm' : 'cnpm')
  cfg.set('moduleManage', moduleManage)
  const [arg1, ...argMore] = process.argv.slice(2)
  if( (arg1 === 'init') && !argMore.length && !hasModules('./') ) {
    await execFileSync(`${moduleManage} i`)
  }

  if(!hasModules('./')) {
    console.log('qs init')
    return
  }

  // -------------- start

  const program = require('commander')
  const js = require('./core/js.js')

  const {log} = console

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
      cleanArgs(arg, js)
    })

  program
    .command('cfg')
    .description('config')
    .option('--json [key=val]', 'View or change configuration')
    .option('--jsonReset', 'Reset to default configuration')
    .option('--delModouse', 'Delete all node_modules')
    .action((arg) => {
      cleanArgs(arg, require('./cfg.js'))
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
    log()
    log(`  Run qs <command> --help for detailed usage of given command.`)
    log()
  })

  program
    .command('*')
    .description('More features')
    .action(async function(){
      const extendFile = {
        ss: './extend/ss/ss.js',
      }[arg1]
      if(extendFile) { // extend function
        hasModules(`./extend/${arg1}/`) ? require(pathAbs(extendFile)) : console.log('qs init -e')
      } else { // other function
        hasModules('./other/') ? require(pathAbs('./other/index.js'))({arg1, argMore}) : console.log('qs init -o')
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
    if(cb) {
      cb(args)
    } else {
      return args
    }
  }
}

function list(val) {
  return val.split(',').filter(item => item)
}

