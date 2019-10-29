const {
  qsPath,
  run,
  dateFormater,
  createFileOrDir,
  nodeBin,
  cfg,
} = global.qs.util
const {
  dataDir,
  openExe,
  moduleManage,
} = cfg.get()

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
  const shelljs = require('shelljs')
  const date = dateFormater('YYYYMMDDHHmmss', new Date())
  const dataDirDate = `${dataDir}/${date}/`
  shelljs.mkdir('-p', dataDirDate)
  shelljs.cp('-r', qsPath('./template/vue/*'), dataDirDate)
  shelljs.exec(`code ${dataDirDate}`)
  await run.execFileSync(`${nodeBin('browser-sync', './')} start --no-notify --server --files '**/**'`, dataDirDate, true)
}

