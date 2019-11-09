class Run {
  /**
  * 这个 class 用于封装一个 run 方法, 它初始化一个 task, 统一了几个运行命令的函数,
  * 让这些函数可以传入 isSave 来实现是否保存当前函数的运行命令到 task.json 的 execList 中.
  *
  * @param {Stirng|Array} cmd - 要执行的命令,
  *   Stirng - 一般用来运行整行命令, 例如 'ls -a -l'
  *   Array - 用来运行主执行程序与参数分享为数组的命令, 例如 ['ls', '-a', '-l']
  *
  * @param {Stirng|Array} arg - 传给函数的其他参数, 实际运行 utils 中的 spawnWrap(cmd, ...arg)
  *   Stirng - 为了方便, 当数组只有一个值的时候可以直接传, 将转换为数组
  * @param {Boolean} [isSave=false] - 是否保存到任务命令历史中
  */

  constructor (runTable) {
    this.runTable = runTable
    return this
  }

  async execFileSync () {return this.mapFn('execFileSync', arguments)}
  async execAsync () {return this.mapFn('execAsync', arguments)}
  async spawnWrap () {return this.mapFn('spawnWrap', arguments)}

  async shelljsExec (cmd, arg = [], isSave = false) { // 可以实时输出, 不能交互
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

