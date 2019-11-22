process.env.LANG = 'zh_CN.UTF-8' // 统一语言环境, 以避免产生不同结果
const fs = require('fs')
const assert = require('assert')
const shelljs = require('shelljs')
const isWindows = require('os').type() === 'Windows_NT'
const child_process = require('child_process')
const configFile = absPath('../config.json')
const taskFile = absPath('../task.json')

function execSync(cmd, out = true) {
  let str = child_process.execSync(cmd).toString().trim()
  out && console.log(str)
  return str
}

function spawn(arr, option = {}) {
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
  return `${Date.now()}_${increment}`.replace(/_/g, sep)
}

function sleep(time = 1000) { return new Promise((res, rej) => setTimeout(res, time)) }

function clearRequireCache() { // 清除 require 缓存, 使用场景: 当 require 同一个 json 文件, 但这文件改变后再 require 时并没有改变
  Object.keys(require.cache).forEach(key => delete require.cache[key])
}

function absPath(file = '') { return require('path').resolve(__dirname, file) }

function allTestBefore() {
  console.log('备份用户配置')
  shelljs.cp('-f', configFile, `${configFile}.bak`)
  shelljs.cp('-f', taskFile, `${taskFile}.bak`)

  console.log('初始化用户配置')
  execSync('qs --config-reset')
  fs.writeFileSync(absPath('../task.json'), '[]\n', 'utf8')
}

function allTestAfter() {
  console.log('恢复用户配置')
  shelljs.mv('-f', `${configFile}.bak`, configFile)
  shelljs.mv('-f', `${taskFile}.bak`, taskFile)
  console.log('测试完成')
}

module.exports = {
  allTestAfter,
  allTestBefore,
  fs,
  configFile,
  taskFile,
  assert,
  shelljs,
  isWindows,
  execSync,
  spawn,
  requireUncached,
  uuid,
  sleep,
  clearRequireCache,
  absPath,
}
