const fs = require('fs')
const path = require('path')
const os = require('os')
const shelljs = require('shelljs')
const util = require('../util.js')
const task = require('../task.js')
const {
  dateFormater,
  createFileOrDir,
  execFileSync,
  pathAbs,
  nodeBin,
} = util
const { log } = console

const {
  openExe,
  moduleManage,
} = util.cfg.get()

// Directory of resources
const baseDir = `${os.homedir()}/.qs/js/`

// Initialization template
const template = {
js: `\
;(async () => {
const {log} = console
log(new Date().toLocaleString())

})();
`,
ts: `\
// ts
`,
coffee: `\
// coffee
`,
}


module.exports = async (arg) => {
  // process.stdin.resume();
  // process.stdin.setEncoding('utf8');
  // process.stdin.on('data', function(data) {
  //   console.log('data', data);
  //   process.stdout.write(data);
  // });

  const type = arg.fileName.replace(/.*\.(.*)$/, '$1') // Get the file name suffix
  const date = dateFormater('YYYYMMDDHHmmss', new Date())
  const fileDir = baseDir + date + '/'
  const fileName = fileDir + arg.fileName
  log(fileName)
  createFileOrDir(fileName, template[type] || '')

  if(arg.module) {
    const cmd = `${moduleManage} i -S ${arg.module.join(' ')}`
    await execFileSync(cmd, fileDir)
  }

  if(arg.openDir) {
    shelljs.exec(`${openExe} ${fileDir}`)
    shelljs.exec(`${openExe} ${fileName}`)
  } else {
    shelljs.exec(`${openExe} ${fileName}`)
  }
  const cmd = `${nodeBin('nodemon', './')} -q --watch "${fileName}" --exec "node ${fileName}"`
  await task({cmd: 'updateOne', arg: {data: {
    rawCmd: cmd
  }}})

  await execFileSync(cmd)
}

