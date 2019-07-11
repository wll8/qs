const fs = require('fs')
const path = require('path')
const os = require('os')
const shelljs = require('shelljs')
const util = require('../util.js')
const {nodemon, cnpm, npm} = util.nodeBin
const { log } = console

const {openExe} = CFG.get()

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


module.exports = (arg) => {

  // process.stdin.resume();
  // process.stdin.setEncoding('utf8');
  // process.stdin.on('data', function(data) {
  //   console.log('data', data);
  //   process.stdout.write(data);
  // });

  const type = arg.fileName.replace(/.*\.(.*)$/, '$1') // Get the file name suffix
  const date = util.dateFormater('YYYYMMDDHHmmss', new Date())
  const fileDir = baseDir + date + '/'
  const fileName = fileDir + arg.fileName
  log(fileName)
  util.createFileOrDir(fileName, template[type] || '')

  if(arg.module) {
    const cmd = `${cnpm} i ${arg.module.join(' ')}`
    shelljs.exec(cmd)
  }

  if(arg.openDir) {
    shelljs.exec(`${openExe} ${fileDir}`)
    shelljs.exec(`${openExe} ${fileName}`)
  } else {
    shelljs.exec(`${openExe} ${fileName}`)
  }

  shelljs.exec(`${nodemon} -q --watch "${fileName}" --exec "node ${fileName}"`)
}

