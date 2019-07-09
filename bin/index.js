#!/usr/bin/env node

const chalk = require('chalk')
const js = require('../lib/js.js')
const {log} = console

const program = require('commander');

program
  .version(require('../package').version)
  .usage('<command> [options]')

program
  .command('js')
  .description('Creating JS type applications')
  .option('--openDir', 'Open the directory')
  .option('--manage', 'Specify a package manager to install dependencies[yarn|cnpm|npm]') // default cnpm
  .option('-d, --directory [directoryName]', 'Specify folders', '.')
  .option('-f, --fileName [fileName]', 'Specify a filename, Select template automatically according to suffix', 'index.js')
  .option('--es5 [config]', 'Save and convert to Es5 file')
  .option('-m, --module <moduleName,moduleName2...>', 'Add and automatically install dependencies, separating multiple with commas', list)
  .action((arg) => {
    js(cleanArgs(arg))
  })

program.on('--help', () => {
  log()
  log(`  Run ${chalk.cyan(`qs <command> --help`)} for detailed usage of given command.`)
  log()
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}

function camelize (str) {
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
