process.env.LANG = 'en_US.UTF-8' // 统一语言环境, 以避免产生不同结果
process.on('uncaughtException', err => {
  console.log(err)
  allTestAfter()
  process.exit()
})
process.on('SIGINT', err => {
  console.log('中途退出测试')
  allTestAfter()
  process.exit()
})
const fs = require('fs')
const os = require('os')
const assert = require('assert')
const shelljs = require('shelljs')
const isWin = os.type() === 'Windows_NT'
const child_process = require('child_process')
const qsJs = isWin ? absPath('../index.js').replace(/\\/g, '\\\\') : absPath('../index.js') // 把 windows 的 \ 替换为 \\
const qsDataDir = `${os.homedir()}/.qs/`
const qsExtendDir = absPath(`${qsDataDir}/ext/`)
const configFile = absPath(`${qsDataDir}/config.json`)
const taskFile = absPath(`${qsDataDir}/task.json`)
const packgeAdmin = shelljs.which('cnpm') ? 'cnpm' : 'npm'

function obj2str(obj) {
  return JSON.stringify(obj, null, 2)
}

function getType(data, type) {
  const dataType = Object.prototype.toString.call(data).replace(/(.* )(.*)\]/, '$2').trim().toLowerCase()
  return type ? (dataType === type.trim().toLowerCase()) : dataType
}

function execSync(cmd, option, out = true) {
  if(getType(option, 'boolean')) {
    out = option
    option = {}
  }
  console.log(`cmd:\r\n${cmd}\r\n`)
  let str = child_process.execSync(cmd, option).toString().trim()
  out && console.log(str)
  return str
}

function spawn(arr, option = {}) {
  console.log(`arr:\r\n${obj2str(arr)}\r\n`)
  console.log(`cmd:\r\n${arr.join(' ')}\r\n`)
  let [arg1, ...argMore] = arr
  child_process.spawn(arg1, argMore, {
    stdio: 'inherit',
    ...option
  })
}

function requireUncached(filePath) { // 避免 require 使用缓存
  delete require.cache[require.resolve(filePath)]
  return require(filePath)
}

function uuid(sep = '') {
  let increment = process.increment === undefined ? (process.increment = 1) : (process.increment = (process.increment + 1))
  // let str = `${increment}_${process.pid}_${('' + (Math.random() + Math.random()))}`
  // console.log('increment', increment)
  // return str.replace('.', '').replace(/_/g, sep)
  return `${Number(String(Date.now()).slice(-5))}_${String(Math.random()).slice(-2)}_${process.pid}_${increment}`.replace(/_/g, sep)
}

function sleep(time = 1000) { return new Promise((res, rej) => setTimeout(res, time)) }

function clearRequireCache() { // 清除 require 缓存, 使用场景: 当 require 同一个 json 文件, 但这文件改变后再 require 时并没有改变
  Object.keys(require.cache).forEach(key => delete require.cache[key])
}

function absPath(file = '') { return require('path').resolve(__dirname, file) }

function allTestBefore() {
  console.log('备份用户配置')
  shelljs.mv(configFile, `${configFile}.bak`)
  shelljs.mv(taskFile, `${taskFile}.bak`)
  shelljs.mv(`${qsExtendDir}`, `${qsExtendDir}.bak`)
}

function allTestAfter() {
  console.log('恢复用户配置')
  shelljs.rm(
    '-rf',
    configFile,
    taskFile,
    qsExtendDir,
  )
  shelljs.mv(`${configFile}.bak`, configFile)
  shelljs.mv(`${taskFile}.bak`, taskFile)
  shelljs.mv(`${qsExtendDir}.bak`, `${qsExtendDir}`)
}

module.exports = {
  os,
  packgeAdmin,
  qsJs,
  qsDataDir,
  qsExtendDir,
  allTestAfter,
  allTestBefore,
  fs,
  configFile,
  taskFile,
  assert,
  shelljs,
  isWin,
  execSync,
  spawn,
  requireUncached,
  uuid,
  sleep,
  clearRequireCache,
  absPath,
}
