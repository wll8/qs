const fs = require('fs')
const shelljs = require('shelljs')
const {
  pathAbs,
  cfg,
  execAsync,
  execFileSync,
} = require('./util.js')

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
