process.env.LANG = 'zh_CN.UTF-8' // 统一语言环境, 以避免产生不同结果
const assert = require('assert')
const child_process = require('child_process')
const fs = require('fs')
const shelljs = require('shelljs')

describe('扩展功能', () => {
  describe('extend 目录扩展', () => {
    it('当前目录下的同名 js 文件', () => {
      let name = uuid()
      let path = absPath(`../extend/${name}.js`)
      fs.writeFileSync(path, `console.log(${name})`)
      assert.ok(execSync(`qs ${name}`).includes(name))
      shelljs.rm('-rf', path)
    })
    it('同名目录中 package 中的 bin', () => {
      let name = uuid()
      let path = absPath(`../extend/${name}`)
      shelljs.mkdir(path)
      fs.writeFileSync(`${path}/a.js`, `console.log('aaa')`)
      fs.writeFileSync(`${path}/b.js`, `console.log('bbb')`)
      fs.writeFileSync(`${path}/package.json`, `
        {
          "bin": {
            "a${name}": "a.js",
            "b${name}": "b.js"
          }
        }
      `)
      assert.ok(execSync(`qs a${name}`).includes('aaa'))
      assert.ok(execSync(`qs b${name}`).includes('bbb'))
      shelljs.rm('-rf', path)
    })
    it('同名目录中 package 中的 main', () => {
      let dirName = uuid()
      let path = absPath(`../extend/${dirName}`)
      shelljs.mkdir(path)
      fs.writeFileSync(`${path}/m.js`, `console.log('mmm')`)
      fs.writeFileSync(`${path}/package.json`, `
        {
          "main": "m.js"
        }
      `)
      assert.ok(execSync(`qs ${dirName}`).includes('mmm'))
      shelljs.rm('-rf', path)
    })
    it('bin 的优先级大于 man', () => {
      let name = uuid()
      let path = absPath(`../extend/${name}`)
      shelljs.mkdir(path)
      fs.writeFileSync(`${path}/a.js`, `console.log('aaa')`)
      fs.writeFileSync(`${path}/m.js`, `console.log('mmm')`)
      fs.writeFileSync(`${path}/package.json`, `
        {
          "main": "m.js",
          "bin": {
            "${name}": "a.js"
          }
        }
      `)
      assert.ok(execSync(`qs ${name}`).includes('aaa'))
      shelljs.rm('-rf', path)
    })
    it('同名目录中 index.js', () => {
      let name = uuid()
      let path = absPath(`../extend/${name}`)
      shelljs.mkdir(path)
      fs.writeFileSync(`${path}/index.js`, `console.log(${name})`)
      assert.ok(execSync(`qs ${name}`).includes(name))
      shelljs.rm('-rf', path)
    })
    it('不同名目录中的 bin', () => {
      let name = uuid()
      let path = absPath(`../extend/${uuid()}`) // 随机目录
      shelljs.mkdir(path)
      fs.writeFileSync(`${path}/a.js`, `console.log('aaa')`)
      fs.writeFileSync(`${path}/package.json`, `
        {
          "bin": {
            "${name}": "a.js"
          }
        }
      `)
      assert.ok(execSync(`qs ${name}`).includes('aaa'))
      shelljs.rm('-rf', path)
    })
    it('参数接收', () => {
      let name = uuid()
      let path = absPath(`../extend/${name}.js`)
      fs.writeFileSync(path, `console.log(process.argv)`)
      assert.ok(execSync(`qs ${name} ${name}`).includes(name))
      shelljs.rm('-rf', path)
    })
  })
  // describe('outside 目录扩展', () => {
  //   // ...
  // })
})
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
