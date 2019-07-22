const fs = require('fs')
const shelljs = require('shelljs')
const {pathAbs, cfg} = require('./util.js')

module.exports = async (arg) => {
  if(arg.json === true) { // json
    console.log(cfg.get())
  } else if (arg.json) {
    const [, key, val] = arg.json.match(/(.+?)=(.*)/) || [, arg.json]
    if(val !== undefined) {
      cfg.set(key, val)
      console.log(cfg.get())
    } else {
      console.log(cfg.get()[key])
    }
  }
  if(arg.jsonReset === true) { // jsonReset
    const defaultCfg = {
      openExe: 'code',
      moduleManage: '',
      defaultOther: [
        'shx',
        'nodemon',
        'json',
        'http-server',
        'fkill-cli',
      ],
      defaultExtend: [
        'ss',
      ],
    }
    fs.writeFileSync(pathAbs('./config.json'), JSON.stringify(defaultCfg, null, 2), 'utf8')
    console.log(defaultCfg)
  }
  if(arg.delModouse === true) { // delModouse
    shelljs.rm('-rf', pathAbs('./node_modules'))
    shelljs.rm('-rf', pathAbs('./other/node_modules'))
    cfg.get().defaultExtend.forEach(dir => shelljs.rm('-rf', pathAbs(`./extend/${dir}/node_modules`)))

  }
}
