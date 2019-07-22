#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const child_process = require('child_process')
const {
  execFileSync,
  pathAbs,
  nodeBin,
  cfg,
} = require('./util.js')

;(async () => {
  const moduleManage =  cfg.get().moduleManage || ((await exec('cnpm -v')).error ? 'npm' : 'cnpm')
  cfg.set('moduleManage', moduleManage)
  const [arg1, ...argMore] = process.argv.slice(2)
  const hasModules = fs.existsSync(path.join(__dirname, 'node_modules'))
  if( (arg1 === 'init') && !argMore.length && !hasModules ) {
    await execFileSync(`${moduleManage} i`)
  }

  if(!hasModules) {
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
    .option('--json [keyVal]', 'View or change configuration')
    .option('--jsonReset', 'Reset to default configuration')
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
      const cmdFile = {
        ss: './extend/ss/ss.js',
      }[arg1]
      if(cmdFile) { // 扩展功能
        require(pathAbs(cmdFile))
      } else { // 其他功能
        const cmd = `node ${nodeBin(arg1)} ${argMore.join(' ')}`

        // 不优雅的判断管道判断
        const chunk = await new Promise((resolve, reject) => {
          process.stdin.on('data', chunk => {
            resolve(String(chunk))
          })
          setTimeout(() => resolve(undefined), 10)
        })
        if(chunk) {
          const argStr = argMore.map(item => `'${item}'`).join(' ')
          const cmd = `echo '${chunk.replace(/\n/g, "")}' | node ${nodeBin(arg1)} ${argStr}`
          const {error, stdout, stderr} = await exec(cmd)
          console.log(stdout)
        } else {
          await execFileSync(cmd)
          process.exit()
        }

        // try {
        //   // 有管道数据时
        //   let cdata
        //   process.stdin.on('data', async (chunk) => {
        //     cdata = String(chunk)
        //     const argStr = argMore.map(item => `'${item}'`).join(' ')
        //     const cmd = `echo '${String(chunk).replace(/\n/g, "")}' | node ${nodeBin(arg1)} ${argStr}`
        //     const {error, stdout, stderr} = await exec(cmd)
        //     console.log(stdout)
        //   })
        //   setTimeout(() => {
        //     if(!cdata) {
        //       execFileSync(cmd)
        //       process.exit()
        //     }
        //   }, 10);
        // } catch (error) {
        //   console.log('err', error)
        // }
      }

    })

  program.parse(process.argv)

  if (arg1 === undefined) {
    program.outputHelp()
  }

})();

function camelize (str) { // Conversion of horizontal lines to humps
  return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

function cleanArgs (obj, cb) { // Options for paraing user input
  const args = {}
  obj.options && obj.options.forEach(o => {
    const long = o.long.replace(/^--/, '')
    const key = camelize(long)
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

function exec(cmd) {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, (error, stdout, stderr) => {
      resolve({error, stdout, stderr})
    });
  })
}
