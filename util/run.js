const {
  execFileSync,
  execAsync,
} = require('../util/index.js')


class Run {
  /**
  * @param {Stirng} cmd - 要执行的命令
  * @param {*[]} arg - 传给函数的其他参数
  * @param {Boolean} [isSave=false] - 是否保存到任务中命令历史
  */

  constructor () {
    return (async () => {
      return this
    })()
  }

  async execFileSync (cmd, arg = [], isSave = false) {
    isSave && this.save('execFileSync', cmd, arg)
    return execFileSync(cmd, ...arg)
  }

  async execAsync (cmd, arg = [], isSave = false) {
    isSave && this.save('execAsync', cmd, arg)
    return execAsync(cmd, ...arg)
  }

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

}

// new Promise(async () => {
//   const run = await new Run()
//   await run.execFileSync('ls /', ['/var'], true)
//   await run.execFileSync('ls', ['/home'], true)
//   await run.execFileSync('ls', ['/home'], true)
// })

module.exports = Run

