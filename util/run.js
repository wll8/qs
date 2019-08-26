const QS_PATH = global.QS.QS_PATH
const {
  execFileSync,
  execAsync,
  spawnWrap,
} = require(QS_PATH('./util/index.js'))


class Run {
  /**
  * @param {Stirng} cmd - 要执行的命令
  * @param {*[]} arg - 传给函数的其他参数
  * @param {Boolean} [isSave=false] - 是否保存到任务中命令历史
  */

  constructor () {
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

  async save (method, cmd, arg) { // 注意, 请确保 TASK 已初始化
    const TASK = global.QS.TASK
    const curTask = await TASK.getCurlTask()
    TASK.updateOne(null, {
      execList: (curTask.execList || []).concat({ method, cmd, arg, })
    })
  }

  mapFn(fnName, argList) {
    const fnTable = {
      execAsync,
      execFileSync,
      spawnWrap,
    }
    let [cmd, arg = [], isSave = false] = argList
    arg = Array.isArray(arg) ? arg : [arg]
    isSave && this.save(fnName, cmd, arg)
    return fnTable[fnName](cmd, ...arg)
  }

}

// new Promise(async () => {
//   const run = await new Run()
//   await run.execFileSync('ls /', ['/var'], true)
//   await run.execFileSync('ls', ['/home'], true)
//   await run.execFileSync('ls', ['/home'], true)
// })

module.exports = Run

