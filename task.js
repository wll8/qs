const fs = require('fs')

const psList = async () => {
  let list = await require('ps-list')()
  list.forEach(item => {delete item.cpu; delete item.memory; delete item.name})
  return list
}
const {
  pathAbs,
  dateFormater,
  execFileSync,
  execAsync,
} = require('./util.js')
const taskPath = pathAbs('./task.json')

module.exports = async ({cmd, arg}) => {
  const [ARG1, ...ARG_MORE] = process.argv.slice(2)
  const START_TIME = dateFormater('YYYY-MM-DD HH:mm:ss', new Date())
  const isAdminTask = await new Promise(async (resolve) => { // 不是父进程发起的任务
    const psListData = await psList()
    const processInfo = psListData.find(item => item.pid === process.pid)
    const parentProcessInfo = psListData.find(item => item.pid === processInfo.ppid)
    const isProcessAdmin = JSON.parse((await execAsync(`node ${pathAbs('./util.js')} getArgv_json ${processInfo.cmd}`)).stdout)[2] === 'admin'
    const isParentProcessAdmin = JSON.parse((await execAsync(`node ${pathAbs('./util.js')} getArgv_json ${parentProcessInfo.cmd}`)).stdout)[2] === 'admin'
    resolve(isProcessAdmin || isParentProcessAdmin)
  })
  const fn = {
    get(taskId) { // 获取任务信息
      const taskList = this.readTaskList()
      return taskId ? taskList.find(item => item.taskId === taskId) : taskList
    },
    async saveProcess () { // 保存当前进程到任务记录
      if( !['init', 'admin', '--help', undefined].includes(ARG1) ) {
        const taskList = this.readTaskList()
        { // 删除 pid 重复的记录
          const findInex = taskList.findIndex(item => item.pid === process.pid)
          if(findInex > -1) {taskList.splice(findInex,  1)}
        }
        const newTaskId = taskList.length ? Math.max.apply(null, taskList.map(item => item.taskId)) + 1 : 0
        const psListData = await psList()
        const processInfo = psListData.find(item => item.pid === process.pid)

        processInfo.taskId = newTaskId
        processInfo.status = 'runing'
        TASKID = newTaskId
        processInfo.startTime = START_TIME
        taskList.push(processInfo)
        !isAdminTask && this.writeTaskList(taskList)
      }
    },
    cleanTaskRecord (taskId) { // 根据 taskId 删除任务记录
      const taskList = this.readTaskList()
      taskList.splice(taskList.findIndex(item => item.taskId === taskId),  1)
      this.writeTaskList(taskList)
    },
    stop(taskId) { // 停止任务
      process.kill(this.get(taskId).pid)
    },
    async start(taskId) { // 重启任务
      const {rawCmd, cmd} = this.get(taskId)
      const {
        pid,
        ppid,
        uid,
      } = (await psList()).find(item => item.pid === process.pid)
      this.updateOne({taskId, data: { // 更新任务状态
        pid,
        ppid,
        uid,
        status: 'runing',
        updateTime: dateFormater('YYYY-MM-DD HH:mm:ss', new Date()),
      }})
      execFileSync(rawCmd || cmd)
    },
    async updateList() { // 刷新任务列表信息
      const psListData = await psList()
      let taskList = this.readTaskList()
      taskList = taskList.splice(-3) // 保留多少条任务记录
      taskList.forEach((tItem, index) => {
        const psData = psListData.find(psItem => ( // todo 匹配方式可能出现错误
          psItem.uid === tItem.uid
          && psItem.pid === tItem.pid
          && psItem.ppid === tItem.ppid
        ))
        if(psData) {
          // 不允许修改 cmd rawCmd, 因为 psData 的 cmd 根据 pid 不同值不同
          isAdminTask && (delete psData.cmd)
          isAdminTask && (delete psData.rawCmd)
          taskList[index] = {...tItem, ...psData}
        } else {
          taskList[index] = {...tItem, status: 'stoped'}
        }
      })
      this.writeTaskList(taskList)
    },
    async updateOne({taskId, data}) { // 使用 taskId 更新任务记录
      taskId = taskId || this.getCurlTaskId()
      let taskList = this.readTaskList()
      taskList.forEach((tItem, index) => {
        if(tItem.taskId === taskId) {
          taskList[index] = {...tItem, ...data}
        }
      })
      this.writeTaskList(taskList)
    },
    getCurlTaskId() {
      let taskList = this.readTaskList()
      return (taskList.find(item => item.pid === process.pid) || {}).taskId
    },
    writeTaskList(taskList) {
      fs.writeFileSync(taskPath, JSON.stringify(taskList, null, 2))
    },
    readTaskList() {
      return JSON.parse(fs.readFileSync(taskPath, 'utf-8'))
    }
  }

  return fn[cmd] ? fn[cmd](arg) : fn['get'](arg)

}

