const fs = require('fs')
const shelljs = require('shelljs')
const {
  cfg,
} = require('./util/index.js')
const QS_PATH = global.QS.QS_PATH

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
      fs.writeFileSync(QS_PATH('./config.json'), JSON.stringify(defaultCfg, null, 2), 'utf8')
      console.log(defaultCfg)
    }
    if(deleteNodeModouse === true) { // Remove installed dependencies
      shelljs.rm('-rf', QS_PATH('./node_modules'))
      shelljs.rm('-rf', QS_PATH('./other/node_modules'))
      cfg.get().defaultExtend.forEach(dir => shelljs.rm('-rf', QS_PATH(`./extend/${dir}/node_modules`)))
    }
  }

  { // task
    const Task = require('./task.js')
    const taskFn = await new Task()
    await taskFn.updateList()
    if(task === true) { // 查看所有任务记录
      const taskList = await taskFn.get()
      taskList.forEach(item => {delete item.ppid; delete item.uid})
      console.log(taskList)
    } else if(task) {
      const [, key, val] = task.match(/(.+?)=(.*)/) || [, task]
      console.log(key, val)
      key === 'start' && taskFn.start(+val) // 启动任务
      key === 'stop' && taskFn.stop(+val) // 停止任务
      // key === 'filter' && taskFn({cmd: 'start', arg: val}); // todo: 以 key 正则匹配过滤任务
    }

  }
}
