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
} = cfg.get

// Initialization template
const template = {
js: `\
;(async () => {
console.log('hi qs')

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
  const type = arg.fileName.replace(/.*\.(.*)$/, '$1') // Get the file name suffix
  const date = dateFormater('YYYY_MM_DD_HH_mmss', new Date())
  const fileDir = arg.directory ? qsPath([process.cwd(), arg.directory]) : `${dataDir}/js__${date}/`
  const fileName = qsPath(fileDir + '/' + arg.fileName)

  process.stdout.write(`fileName: ${fileName}\n`)
  createFileOrDir(fileName, template[type] || '')

  if(arg.module) {
    const cmd = `${moduleManage} i -S ${arg.module.join(' ')}`
    await run.execFileSync(cmd, [fileDir], true)
  }

  if(arg.openDir) {
    await run.shelljsExec(`${openExe} ${fileDir}`, [], true)
    await run.shelljsExec(`${openExe} ${fileName}`, [], true)
  } else {
    await run.shelljsExec(`${openExe} ${fileName}`, [], true)
  }

  const cmd = `node ${nodeBin('nodemon', './')} -q --watch "${fileName}" --exec "node ${fileName}"`
  await run.execFileSync(cmd, [], true)
}

