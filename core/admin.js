const {
  qsPath,
  cfg,
  print,
 } = global.qs.util
const fs = require('fs')
const shelljs = require('shelljs')

module.exports = async (arg) => {
  const {
    config,
    resetConfig,
    deleteNodeModouse,
    task,
  } = arg

  { // config resetConfig deleteNodeModouse
    if(config === '') { // View Configuration
      print(cfg.get())
    } else if (config) { // View or update configuration
      const [, key, val] = config.match(/(.+?)=(.*)/) || [, config]
      if(val !== undefined) {
        cfg.set(key, val)
        print(cfg.get()[key])
      } else {
        print(cfg.get()[key])
      }
    }
    if(resetConfig === true) { // Reset default configuration
      const defaultCfg = {
        openExe: 'code',
        moduleManage: '',
        taskRecord: 99,
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
      fs.writeFileSync(qsPath('./config.json'), JSON.stringify(defaultCfg, null, 2), 'utf8')
      print(defaultCfg)
    }
    if(deleteNodeModouse === true) { // Remove installed dependencies
      shelljs.rm('-rf', qsPath('./node_modules'))
      shelljs.rm('-rf', qsPath('./other/node_modules'))
      cfg.get().defaultExtend.forEach(dir => shelljs.rm('-rf', qsPath(`./extend/${dir}/node_modules`)))
    }
  }

  { // task
    const Task = require(qsPath('./util/task.js'))
    const taskFn = await new Task()
    await taskFn.updateList()
    if(task === true) { // 查看所有任务记录
      const taskList = await taskFn.get()
      taskList.forEach(item => {delete item.ppid; delete item.uid})
      print(taskList)
    } else if(task) {
      const [, key, val] = task.match(/(.+?)=(.*)/) || [, task]
      // console.log(key, val)
      key === 'start' && taskFn.start(+val) // 启动任务
      key === 'stop' && taskFn.stop(+val) // 停止任务
      // key === 'filter' && taskFn({cmd: 'start', arg: val}); // todo: 以 key 正则匹配过滤任务
    }

  }
}
