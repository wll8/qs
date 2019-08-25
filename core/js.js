const fs = require('fs')
const path = require('path')
const os = require('os')
const QS_PATH = global.QS.QS_PATH
const util = require('../util/index.js')
const {
  dateFormater,
  createFileOrDir,
  nodeBin,
} = util

const {
  openExe,
  moduleManage,
  dataDir,
} = util.cfg.get()

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
  const date = dateFormater('YYYY_MM_DD_HH_mmss', new Date())
  const fileDir = arg.directory ? QS_PATH([process.cwd(), arg.directory]) : `${dataDir}/js__${date}/`
  const fileName = QS_PATH(fileDir + '/' + arg.fileName)

  process.stdout.write(`fileName: ${fileName}\n`)
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

