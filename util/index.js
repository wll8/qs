const fs = require('fs')
const http = require('http')
const path = require('path')
const child_process = require('child_process')
const os = require('os')
const { Console } = require('console')
const { inspect } = require('util')
const qsPath = require('./qsPath.js')

const PRINT = new Console({ stdout: process.stdout, stderr: process.stderr })

function getRes(url, is_down = false) {
  // Obtain url from res.
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      const { statusCode } = res;
      let contentLength = parseInt(res.headers['content-length']);
      if(statusCode !== 200) {
        reject(statusCode)
      }
      let data = '';
      if(is_down) {
        res.setEncoding('binary');
      } else {
        res.setEncoding('utf8');
      }
      res.on('data', function (chunk) {
        data += chunk;
        if(is_down) {
          let length = ((data.length) / contentLength) * 100;
          let percent = parseInt(((length).toFixed(0)));
          // Terminal progress bar
          print(`${url.split('/').slice(-1)[0]} downloaded/total = ${data.length}/${contentLength} = ${percent}/100\r`);
        }
      });
      res.on('end', function () {
        if(!is_down) {
          data.toString('utf8')
        }
        resolve(data)
      });
    }).setTimeout(3000, () => {
      log('timeout')
      reject('')
    })
  })
}

function hasFile(filePath) {
  try {
    fs.accessSync(filePath)
    return true
  } catch (err) {
    return false
  }
}

function dateFormater(formater, t) { // Formatting time
  let date = t ? new Date(t) : new Date(),
    Y = date.getFullYear() + '',
    M = date.getMonth() + 1,
    D = date.getDate(),
    H = date.getHours(),
    m = date.getMinutes(),
    s = date.getSeconds();
  return formater.replace(/YYYY|yyyy/g, Y)
    .replace(/YY|yy/g, Y.substr(2, 2))
    .replace(/MM/g, (M < 10 ? '0' : '') + M)
    .replace(/DD/g, (D < 10 ? '0' : '') + D)
    .replace(/HH|hh/g, (H < 10 ? '0' : '') + H)
    .replace(/mm/g, (m < 10 ? '0' : '') + m)
    .replace(/ss/g, (s < 10 ? '0' : '') + s)
}

function nodeBin(cli, dir = './other/', useMainPackage = true) { // 查找存在于 package.bin 中的 cli, 也就是 bin 的键名, 并给出对应的路径, 键值
  // useMainPackage: true, 从给定目录的 package.dependencies 所涉及到的 node_modules 中去查找 bin
  // useMainPackage: false, 已经知道 cli 所在的 package.json 目录, 不再从 node_modules 中查找

  let binObj = {}
  const getBin = (pkgName, package) => { // pkgName 是包名, 如包名为 fkill-cli 的 bin 是 fkill, node_modules 下的是 fkill-cli, 命令行中运行的是 fkill
    const pkgBin = package.bin
    if(typeof(pkgBin) === 'string') {
      binObj[package.name] = pkgBin
      binObj[package.name + '_pkgName'] = pkgName
    } else if(typeof(pkgBin) === 'object') {
      for (const key2 in pkgBin) {
        if (pkgBin.hasOwnProperty(key2)) {
          binObj[key2] = pkgBin[key2]
          binObj[key2 + '_pkgName'] = pkgName
        }
      }
    }
    return binObj
  }

  if(useMainPackage === false) {
    const package = require(qsPath(`${dir}/package.json`))
    binObj = getBin(dir, package)
  } else {
    const dependencies = require(qsPath(`${dir}/package.json`)).dependencies
    for (const pkgName in dependencies) {
      if (dependencies.hasOwnProperty(pkgName)) {
        const package = require(qsPath(`${dir}/node_modules/${pkgName}/package.json`))
        binObj = getBin(pkgName, package)
      }
    }
  }

  const pkgName = binObj[cli + '_pkgName']
  if(useMainPackage === false) {
    return pkgName === undefined ? undefined : qsPath(`${dir}/${binObj[cli]}`)
  } else {
    return pkgName === undefined ? undefined : qsPath(`${dir}/node_modules/${pkgName}/${binObj[cli]}`)
  }
}

function nodeBinNoMainPackage (cli, dir = './extend/') { // 从指定目录中以最大程度返回 cli 路径
  // 取值顺序:
  // - 当前目录下的同名 js 文件
  // - 同名目录中 package 中的 bin
  // - 同名目录中 package 中的 main
  // - 同名目录中 index.js
  // - 不同名目录中的 bin
  dir = qsPath(dir)
  let res // 获取到的 cli 路径
  fs.readdirSync(qsPath(dir)).map(item => path.join(dir, item)).find(item => { // 遍历当前目录

    const testJs = (new RegExp(`${cli}\\.js$`)).test(item)
    if(testJs) { // 同名 js
      return (res = item)
    }
    const sameDir = qsPath(`${dir}/${cli}`)

    if(hasFile(sameDir)) { // 如果与 cli 同名目录存在
      const sameDirIndex = qsPath(`/${sameDir}/index.js`)
      const packagePath = qsPath(`/${sameDir}/package.json`)
      const hasPackage = hasFile(packagePath)
      if(!hasPackage && hasFile(sameDirIndex)) { // 不存在 package 则取 index.js
        return (res = sameDirIndex)
      }
      if(hasPackage) { // 存在 package 时取 bin
        const bin = nodeBin(cli, sameDir, false)
        if(bin) {
          return (res = bin)
        } else { // bin 不存在时取 main
          const packageMan = require(packagePath).main
          if(packageMan) {
            return (res = qsPath(`/${sameDir}/${packageMan}`))
          } else { // main 不存在时取 index
            return (res = qsPath(`/${sameDir}/index.js`))
          }
        }
      }

    } else if(hasFile(qsPath(`/${item}/package.json`))) { // 如果与 cli 同名目录不存在, 则在所有存在 package 的目录中找 bin
      const bin = nodeBin(cli, item, false)
      if(bin) { // 存在 package 时获取 package 中的 bin
        return (res = bin)
      }
    }

  })
  return res
}

function getFiles(dirPath, filterReStr) {
  let res = []
  function findFile(getPath) {
    let files = fs.readdirSync(getPath)
    files.forEach(function(item, index) {
      let fPath = path.join(getPath, item)
      let stat = fs.statSync(fPath)
      if (stat.isDirectory() === true) {
        console.log('fPath', fPath)
        findFile(fPath)
      }
      if (stat.isFile() === true) {
        res.push(fPath)
      }
    })
  }
  findFile(dirPath)
  if(filterReStr) {
    let re = new RegExp(filterReStr)
    console.log('re', re)
    res = res.filter(item => re.test(item))
  }
  console.log(res)
}

function createFileOrDir(filepath, str) { // Create file. If there is `/` after the path, it is considered a directory.
  const shelljs = require('shelljs')
  if(filepath.match(/\/$/)) { // Create directory
    shelljs.mkdir('-p', filepath)
  } else { // Create directory and file
    shelljs.mkdir('-p', filepath.split('/').slice(0, -1).join('/'))
    fs.writeFileSync(filepath, str, 'utf8')
  }
}


function deepGet(object, path, defaultValue) {
  let res = (!Array.isArray(path)
    ? path
      .replace(/\[/g, '.')
      .replace(/\]/g, '')
      .split('.')
    : path
  ).reduce((o, k) => (o || {})[k], object)
  return res !== undefined ? res : defaultValue
}

function findNextMin(arr, sub = 1) { // 从数组中找到一个不存在的最小的数, 至少从 sub 数开始
  const sortArr = arr.sort((a, b) => a - b) // 从小到大排序
  if(sortArr[0] > sub) {sortArr.unshift(sub - 1)}
  const nextId = (sortArr.find((item, index) => (item+1 !== arr[index+1])) || 0) + 1 // 找到第一个不连续的数并加1
  return nextId
}

function deepSet(object, keys, val) {
  keys = Array.isArray(keys) ? keys : keys
    .replace(/\[/g, '.')
    .replace(/\]/g, '')
    .split('.');
  if (keys.length > 1) {
    object[keys[0]] = object[keys[0]] || {}
    deepSet(object[keys[0]], keys.slice(1), val)
    return object
  }
  object[keys[0]] = val
  return object
}

const cfg = {
  qsConfig: qsPath('./config.json'),
  get(keys) {
    let obj = require(this.qsConfig)
    if(keys === undefined) {
      return obj
    }
    let res = deepGet(obj, keys, '')
    return res
  },
  set(path, value) {
    const newCfg = value ? deepSet(require(this.qsConfig), path, value) : path
    fs.writeFileSync(this.qsConfig, JSON.stringify(newCfg, null, 2), 'utf-8')
    return newCfg
  }
}

function isChina() {
  const isChina = cfg.get().isChina
  if(isChina === '') {
    return new Promise((resolve, reject) => {
      getRes('http://myip.ipip.net').then(res => {
        resolve(res.includes('中国'))
      }).catch(err => resolve(false))
    })
  } else {
    return isChina
  }
}

function hasModules(dir) {
  return fs.existsSync(qsPath(`./${dir}/node_modules`))
}

function execFileSync(cmd, cwd = qsPath('./'), option = {stdio: 'inherit'}) { // 可以实时输出
  return new Promise(async (resolve, reject) => {
    const {stdout} = await execAsync(`node ${qsPath('./util/getArgv.js')} getArgv_json ${cmd}`)
    const [arg1, ...argv] = JSON.parse(stdout)
    child_process.execFileSync(arg1, argv, {
      cwd,
      ...option
    })
    resolve()
  })
}

function spawnWrap(cmd, cwd = qsPath('./'), option = {stdio: 'inherit'}) { // 可以进行交互
  return new Promise(async (resolve, reject) => {
    const {stdout} = await execAsync(`node ${qsPath('./util/getArgv.js')} getArgv_json ${cmd}`)
    const [arg1, ...argv] = JSON.parse(stdout)
    child_process.spawn(arg1, argv, {
      cwd,
      ...option
    }).on('error', err => {
      // 查看错误码对应的信息: http://man7.org/linux/man-pages/man3/errno.3.html
      delete err.stack
      print(err)
    })

    resolve()
  })
}

function execAsync(cmd) { // 同步运行, 不能实时输出
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, (error, stdout, stderr) => {
      resolve({error, stdout, stderr})
    });
  })
}

function print(info) {
  const type = typeof(info)
  type === 'undefined' && PRINT.log('')
  type === 'string' && PRINT.log(info)
  type === 'object' && PRINT.log(inspect(info || '', false, null, true))
}

function resetLog() {
  const log = console.log
  console.log = (...arg) => {
    const getStackTrace = () => {
      const obj = {}
      Error.captureStackTrace(obj, getStackTrace)
      return obj.stack
    }
    const stack = getStackTrace() || ''
    const matchResult = stack.match(/\(.*?\)/g) || []
    const line = (matchResult[1] || '()').match(/^\((.*)\)$/)[1]
    log.apply(console, [
      new Date().toLocaleString(),
      '\r\n',
      line,
      '\r\n',
      ...arg,
    ])
  }
}

module.exports = async () => {
  resetLog()
  return {
    cfg,
    dateFormater,
    findNextMin,
    createFileOrDir,
    nodeBin,
    nodeBinNoMainPackage,
    isChina,
    execFileSync,
    hasModules,
    execAsync,
    spawnWrap,
    print,
    qsPath,
  }
}
