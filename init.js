const util = require('./util/index.js')
const {cfg, qsPath} = util
const path = require('path')

module.exports = async (arg) => {
  const RUN = global.QS.RUN
  const {moduleManage, defaultExtend} = util.cfg.get()
  let installFunction = arg.extend ? defaultExtend : []
  if(arg.other) {
    const packages = cfg.get().defaultOther
    await RUN.execFileSync(`${moduleManage} i -S ${packages.join(' ')}`, qsPath('./other/'))
  }

  for (let index = 0; index < installFunction.length; index++) {
    const element = installFunction[index];
    await RUN.execFileSync(`${moduleManage} i -S`, qsPath(`./extend/${element}`))
  }
}

