const {pathAbs, cfg} = require('./util.js')

module.exports = async (arg) => {
  if(arg.json === true) {
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
  if(arg.jsonReset === true) {
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
    }
    fs.writeFileSync(pathAbs('./config.json'), JSON.stringify(defaultCfg, null, 2), 'utf8')
    console.log(defaultCfg)
  }
}
