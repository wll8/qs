module.exports = ({util, arg1}) => {
  const fs = require('fs')
  const {
    qsPath,
    run,
    cfg,
    dateFormater,
  } = util

  const psList = async () => {
    try {
      let list = await require('ps-list')()
      list.forEach(item => {delete item.cpu; delete item.memory; delete item.name})
      return list
    } catch (error) {
      // ...console.log('no ps-list')
      return []
    }
  }
  const taskPath = qsPath('./task.json')

  class Task {
    constructor () {
      return (async () => { // Async/Await Class Constructor
        this.START_TIME = dateFormater('YYYY-MM-DD HH:mm:ss', new Date())
        this.PSLIST = await psList()
        this.ISADMINTASK = await new Promise(async (resolve) => { // 不是父进程发起的任务
          const psListData = this.PSLIST
          const processInfo = psListData.find(item => item.pid === process.pid)
          if(!processInfo) {return true}
          const parentProcessInfo = psListData.find(item => item.pid === processInfo.ppid)
          const isAdmin = async cmd => (
            JSON.parse(
              (await run.execAsync(`node ${qsPath('./util/getArgv.js')} getArgv_json ${cmd}`)).stdout
            )[2] === 'admin'
          )
          const isProcessAdmin = await isAdmin(processInfo.cmd)
          const isParentProcessAdmin = await isAdmin(parentProcessInfo.cmd)
          resolve(isProcessAdmin || isParentProcessAdmin)
        })
        return this
      })()
    }
    get(taskId) { // 获取任务信息
      const taskList = this.readTaskList()
      return taskId ? taskList.find(item => item.taskId === taskId) : taskList
    }
    async saveProcess () { // 保存当前进程到任务记录
      const taskList = this.readTaskList()
      { // 删除 pid 重复的记录
        const findInex = taskList.findIndex(item => item.pid === process.pid)
        if(findInex > -1) {taskList.splice(findInex,  1)}
      }
      const newTaskId = taskList.length ? Math.max.apply(null, taskList.map(item => item.taskId)) + 1 : 0
      const psListData = this.PSLIST
      const processInfo = psListData.find(item => item.pid === process.pid)

      processInfo.taskId = newTaskId
      processInfo.status = 'runing'
      processInfo.startTime = this.START_TIME
      taskList.push(processInfo)
      !this.ISADMINTASK && this.writeTaskList(taskList)
    }
    cleanTaskRecord (taskId) { // 根据 taskId 删除任务记录
      const taskList = this.readTaskList()
      taskList.splice(taskList.findIndex(item => item.taskId === taskId),  1)
      this.writeTaskList(taskList)
    }
    stop(taskId) { // 停止任务
      const treeKill = require(qsPath('./util/treeKill.js'))
      treeKill(this.get(taskId).pid)
    }
    async start(taskId) { // 重启任务

      const {
        pid,
        ppid,
        uid,
      } = (this.PSLIST).find(item => item.pid === process.pid)
      this.updateOne(taskId, { // 更新任务状态
        pid,
        ppid,
        uid,
        status: 'runing',
        updateTime: dateFormater('YYYY-MM-DD HH:mm:ss', new Date()),
      })

      await this.runTaskIdCmd(taskId)

    }
    async runTaskIdCmd(taskId) { // 运行某个任务的 cmd 或 execList
      const {execList, cmd} = this.get(taskId)
      if(execList.length) {
        execList.forEach(async item => {
          const {method, cmd, arg} = item
          await run[method](cmd, arg)
        })
      } else {
        await run.execFileSync(cmd)
      }
    }

    async updateList() { // 刷新任务列表信息
      const psListData = this.PSLIST
      let taskList = this.readTaskList()
      taskList = taskList.splice(- (Number(cfg.get.taskRecord) || 3)) // 保留多少条任务记录
      taskList.forEach((tItem, index) => {
        const psData = psListData.find(psItem => ( // todo 匹配方式可能出现错误
          psItem.uid === tItem.uid
          && psItem.pid === tItem.pid
          && psItem.ppid === tItem.ppid
        ))
        if(psData) {
          // 注意: 不允许修改运行命令, 因为 psData 的 cmd 根据 pid 不同值不同
          this.ISADMINTASK && (delete psData.cmd)
          this.ISADMINTASK && (delete psData.execList)
          taskList[index] = {...tItem, ...psData}
        } else {
          taskList[index] = {...tItem, status: 'stoped'}
        }
      })
      this.writeTaskList(taskList)
    }
    async updateOne(taskId, data) { // 使用 taskId 更新任务记录
      taskId = taskId || this.getCurlTaskId()
      let taskList = this.readTaskList()
      taskList.forEach((tItem, index) => {
        if(tItem.taskId === taskId) {
          taskList[index] = {...tItem, ...data}
        }
      })
      this.writeTaskList(taskList)
    }
    getCurlTaskId() {
      let taskList = this.readTaskList()
      return (taskList.find(item => item.pid === process.pid) || {}).taskId
    }
    getCurlTask() {
      let taskList = this.readTaskList()
      return taskList.find(item => item.pid === process.pid)
    }
    writeTaskList(taskList) {
      fs.writeFileSync(taskPath, JSON.stringify(taskList, null, 2))
    }
    readTaskList() {
      return JSON.parse(fs.readFileSync(taskPath, 'utf-8'))
    }
  }

  return Task
}

