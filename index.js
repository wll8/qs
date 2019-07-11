#!/usr/bin/env node

const chalk = require('chalk')
const pathAbs = path => require('path').join(__dirname, path)
const program = require('commander');
const shelljs = require('shelljs')

const util = require('./util.js')
global.CFG = util.cfg

const js = require('./lib/js.js')
const init = require('./lib/init.js')

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
    js(cleanArgs(arg))
  })

program
  .command('init')
  .description('Functions of Initializer')
  .action((arg) => {
    init(arg)
  })

program
  .command('ss')
  .description('Get FREE ss configuration')
  .action((arg) => {
    require(pathAbs('./lib/ss/ss.js'))
  })

program.on('--help', () => {
  log()
  log(`  Run ${chalk.cyan(`qs <command> --help`)} for detailed usage of given command.`)
  log()
})

program
  .command('*')
  .description('More features')
  .action(function(...arg){
    // ...
  })

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}

function camelize (str) { // 横线转驼峰
  return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

function cleanArgs (cmd) { // Options for paraing user input
  const args = {}
  cmd.options.forEach(o => {
    const key = camelize(o.long.replace(/^--/, ''))
    if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
      args[key] = cmd[key]
    }
  })
  return args
}

function list(val) {
  return val.split(',').filter(item => item)
}
