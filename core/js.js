const fs = require('fs')
const path = require('path')
const os = require('os')
const util = require('../util/index.js')
const {
  dateFormater,
  createFileOrDir,
  nodeBin,
} = util

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
  const RUN = global.QS.RUN
  const type = arg.fileName.replace(/.*\.(.*)$/, '$1') // Get the file name suffix
  const date = dateFormater('YYYYMMDDHHmmss', new Date())
  const fileDir = baseDir + date + '/'
  const fileName = fileDir + arg.fileName
  console.log(fileName)
  createFileOrDir(fileName, template[type] || '')

  if(arg.module) {
    const cmd = `${moduleManage} i -S ${arg.module.join(' ')}`
    await RUN.execFileSync(cmd, [fileDir], true)
  }

  if(arg.openDir) {
    await RUN.shelljsExec(`${openExe} ${fileDir}`, [], true)
    await RUN.shelljsExec(`${openExe} ${fileName}`, [], true)
  } else {
    await RUN.shelljsExec(`${openExe} ${fileName}`, [], true)
  }

  const cmd = `${nodeBin('nodemon', './')} -q --watch "${fileName}" --exec "node ${fileName}"`
  await RUN.execFileSync(cmd, [], true)
}

