const shelljs = require('shelljs')
const pathAbs = path => require('path').join(__dirname, path)
const util = require('./util.js')
const {execFileSync, cfg} = util
const path = require('path')

module.exports = async (arg) => {
  const {moduleManage, defaultExtend} = util.cfg.get()
  let installFunction = arg.extend ? defaultExtend : []
  if(arg.other) {
    const packages = cfg.get().defaultOther
    await execFileSync(`${moduleManage} i -S ${packages.join(' ')}`, pathAbs('./other/'))
  }

  for (let index = 0; index < installFunction.length; index++) {
    const element = installFunction[index];
    await execFileSync(`${moduleManage} i -S`, pathAbs(`./extend/${element}`))
  }
}

