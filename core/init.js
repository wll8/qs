const {
  cfg,
  qsPath,
  run,
} = global.qs.util

module.exports = async (arg) => {
  const {moduleManage, defaultExtend} = cfg.get()
  let installFunction = arg.extend ? defaultExtend : []
  if(arg.other) {
    const packages = cfg.get().defaultOther
    await run.execFileSync(`${moduleManage} i -S ${packages.join(' ')}`, qsPath('./other/'))
  }

  for (let index = 0; index < installFunction.length; index++) {
    const element = installFunction[index];
    await run.execFileSync(`${moduleManage} i -S`, qsPath(`./extend/${element}`))
  }
}

