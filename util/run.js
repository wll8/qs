class Run {
  /**
  * @param {Stirng} cmd - 要执行的命令
  * @param {*[]} arg - 传给函数的其他参数
  * @param {Boolean} [isSave=false] - 是否保存到任务命令历史中
  */

  constructor (runTable) {
    this.runTable = runTable
    return this
  }

  async execFileSync () {return this.mapFn('execFileSync', arguments)}
  async execAsync () {return this.mapFn('execAsync', arguments)}
  async spawnWrap () {return this.mapFn('spawnWrap', arguments)}

  async shelljsExec (cmd, arg = [], isSave = false) {
    const {exec: shelljsExec} = require('shelljs')
    isSave && this.save('shelljsExec', cmd, arg)
    return shelljsExec(cmd, ...arg)
  }

  async save (method, cmd, arg) { // 注意, 请确保 task 已初始化
    const {
      util: {
        print
      },
      task: taskFn,
    } = global.qs
    let curtask = await taskFn.getCurlTask()
    curtask.execList = (curtask.execList || []).concat({ method, cmd, arg, })
    taskFn.updateOne(curtask.taskId, curtask)
  }

  mapFn(fnName, argList) {
    let [cmd, arg = [], isSave = false] = argList
    arg = Array.isArray(arg) ? arg : [arg]
    isSave && this.save(fnName, cmd, arg)
    return this.runTable[fnName](cmd, ...arg)
  }

}

module.exports = Run

