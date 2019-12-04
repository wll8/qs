module.exports = ({util, pid}) => {
  const curPid = pid
  const fs = require('fs')
  const {
    setTitle,
    obj2str,
    delRequireCache,
    hasFile,
    qsTaskPath,
    qsDataDir,
    qsPath,
    run,
    cfg,
    findNextMin,
    dateFormater,
    handleRaw,
  } = util

  const psList = async () => {
    try {
      let list = await require('ps-list')()
      list.forEach(item => {
        delete item.cpu
        delete item.memory
        delete item.name
      })
      return list
    } catch (error) {
      return []
    }
  }

  class Task {
    constructor () {
      return (async () => { // Async/Await Class Constructor
        this.START_TIME = dateFormater('YYYY-MM-DD HH:mm:ss', new Date())
        this.PSLIST = await psList()
        return this
      })()
    }
    async get(taskIdOrName) { // 根据任务 id 或名称获取任务信息
      const taskList = await this.updateList()
      return taskIdOrName !== undefined
        ? taskList.find(item => (
            (item.taskName === taskIdOrName)
            || (item.taskId === Number(taskIdOrName))
          ))
        : taskList
    }
    async saveProcess () { // 保存当前进程到任务记录
      const taskList = this.readTaskList()
      { // 删除 pid 重复的记录
        const findInex = taskList.findIndex(item => item.pid === curPid)
        if(findInex > -1) {taskList.splice(findInex,  1)}
      }
      const newTaskId = findNextMin(taskList.map(item => item.taskId))
      const psListData = this.PSLIST
      const taskInfo = psListData.find(item => item.pid === curPid)

      taskInfo.taskId = newTaskId
      taskInfo.runCount = 1
      taskInfo.status = 'runing'
      taskInfo.startTime = this.START_TIME
      taskList.push(taskInfo)
      this.writeTaskList(taskList)
    }
    cleanTaskRecord (taskIdOrName) { // 根据 taskId 删除任务记录
      const taskList = this.readTaskList()
      taskList.splice(taskList.findIndex(item => (
        (item.taskName === taskIdOrName)
        || (item.taskId === Number(taskIdOrName))
      )),  1)
      this.writeTaskList(taskList)
    }
    async stop(taskIdOrName) { // 停止任务
      const treeKill = require(qsPath('./lib/treeKill.js'))
      treeKill((await this.get(taskIdOrName)).pid)
    }
    async start(taskIdOrName) { // 重启任务

      const { // 如果正在运行的进程pid列表中存在当前进程pid, 则视为正在运行
        pid,
        ppid,
        uid,
      } = (this.PSLIST).find(item => item.pid === curPid)
      const taskInfo = await this.get(taskIdOrName)
      taskInfo.execList.forEach((item, index) => { // rawCmd 运行时生成新文件, 更新路径到 cmd 字段
        const [option, other = {}] = item.arg
        const newCmd = other.rawCmd ? handleRaw(other.rawCmd) : item.cmd
        taskInfo.execList[index].cmd = newCmd
      })
      this.updateOne(taskIdOrName, { // 更新任务状态
        ...taskInfo,
        pid,
        ppid,
        uid,
        status: 'runing',
        runCount: taskInfo.runCount + 1,
      })

      await this.runTaskIdCmd(taskIdOrName)

    }
    async runTaskIdCmd(taskIdOrName) { // 运行某个任务的 cmd 或 execList
      const {execList = [], cmd, taskName} = await this.get(taskIdOrName)
      setTitle(taskName || taskIdOrName)
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
      taskList = taskList.splice(- (Number(cfg.get().taskRecord) || 3)) // 保留多少条任务记录
      taskList.forEach((tItem, index) => {
        const psData = psListData.find(psItem => ( // todo 匹配方式可能出现错误: 把旧列表与新列表对比 uid pid , 找不到则视为已停止
          psItem.uid === tItem.uid
          && psItem.pid === tItem.pid
          && psItem.ppid === tItem.ppid
        ))
        if(psData) {
          // 注意: 不允许修改运行命令, 因为 psData 的 cmd 根据 pid 不同值不同
          delete psData.cmd
          delete psData.execList
          taskList[index] = {...tItem, ...psData}
        } else {
          taskList[index] = {...tItem, status: 'stoped'}
        }
      })
      this.writeTaskList(taskList)
      return taskList
    }
    async updateOne(taskIdOrName, data) { // 使用 taskId 更新任务记录
      let taskList = this.readTaskList()
      let taskInfo
      taskList.forEach((tItem, index) => {
        if((
          (tItem.taskName === taskIdOrName)
          || (tItem.taskId === Number(taskIdOrName))
        )) {
          taskInfo = {
            ...tItem,
            ...data,
            updateTime: dateFormater('YYYY-MM-DD HH:mm:ss', new Date()),
          }
          taskList[index] = taskInfo
        }
      })
      this.writeTaskList(taskList)
      return taskInfo
    }
    removeOne(taskIdOrName) {
      let taskList = this.readTaskList()
      const findIndex = taskList.findIndex(item => (
        (item.taskName === taskIdOrName)
        || (item.taskId === Number(taskIdOrName))
      ))
      taskList.splice(findIndex, 1)
      this.writeTaskList(taskList)
    }
    getCurlTaskId() {
      let taskList = this.readTaskList()
      return (taskList.find(item => item.pid === curPid) || {}).taskId
    }
    getCurlTask() {
      let taskList = this.readTaskList()
      return taskList.find(item => item.pid === curPid)
    }
    writeTaskList(taskList) {
      fs.writeFileSync(qsTaskPath, obj2str(taskList))
    }
    readTaskList() {
      delRequireCache(qsTaskPath)
      return require(qsTaskPath)
    }
  }

  return Task
}

