const shelljs = require('shelljs')
const pathAbs = path => require('path').join(__dirname, path)
const util = require('./util.js')
const {execFileSync} = util
const path = require('path')

module.exports = async (arg) => {
  const {moduleManage} = util.cfg.get()
  let installFunction = []
  if(arg.extend) {
    installFunction = ['ss']
  }
  if(arg.other) {
    const packages = [
      'shx',
      'nodemon',
      'json',
      'http-server',
      'fkill-cli',
    ]
    await execFileSync(`${moduleManage} i -S ${packages.join(' ')}`, pathAbs('./other/'))
  }

  for (let index = 0; index < installFunction.length; index++) {
    const element = installFunction[index];
    await execFileSync(`${moduleManage} i -S`, pathAbs(`./extend/${element}`))
  }
}

