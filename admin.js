const fs = require('fs')
const shelljs = require('shelljs')
const {pathAbs, cfg} = require('./util.js')

module.exports = async (arg) => {
  const {
    config,
    resetConfig,
    deleteNodeModouse,
    task,
  } = arg

  { // config resetConfig deleteNodeModouse
    if(config === '') { // View Configuration
      console.log(cfg.get())
    } else if (config) { // View or update configuration
      const [, key, val] = config.match(/(.+?)=(.*)/) || [, config]
      if(val !== undefined) {
        cfg.set(key, val)
        console.log(cfg.get())
      } else {
        console.log(cfg.get()[key])
      }
    }
    if(resetConfig === true) { // Reset default configuration
      const defaultCfg = {
        openExe: 'code',
        moduleManage: '',
        defaultOther: [
          'shx',
          'nodemon',
          'json',
          'http-server',
          'browser-sync',
          'fkill-cli',
        ],
        defaultExtend: [
          'ss',
        ],
      }
      fs.writeFileSync(pathAbs('./config.json'), JSON.stringify(defaultCfg, null, 2), 'utf8')
      console.log(defaultCfg)
    }
    if(deleteNodeModouse === true) { // Remove installed dependencies
      shelljs.rm('-rf', pathAbs('./node_modules'))
      shelljs.rm('-rf', pathAbs('./other/node_modules'))
      cfg.get().defaultExtend.forEach(dir => shelljs.rm('-rf', pathAbs(`./extend/${dir}/node_modules`)))
    }
  }
}
