const fs = require('fs')
const http = require('http')
const path = require('path')
const child_process = require('child_process')
const os = require('os')
const isWin = os.type() === 'Windows_NT'
const { Console } = require('console')
const { inspect } = require('util')
const qsPath = require('./qsPath.js')
const hasFile = require(qsPath('./util/hasFile.js'))
const {
  qsExtendDir,
  qsOutsideDir,
  qsDataDir,
  qsConfigPath,
  qsTaskPath,
} = require(qsPath('./util/init.js')).initFile()


const PRINT = new Console({ stdout: process.stdout, stderr: process.stderr })

function getExer(file) { // 获取脚本的执行器
  // 二进制: 自身 , 返回 [自身]
  // 文本: 返回 [执行器, 自身]
  // - 通过 #! 声明获取
  // - 通过后缀匹配
  // - 移交系统执行策略
  let exer = undefined
  const isBinaryFile = require(qsPath('./lib/isBinaryFile.js')).isBinaryFileSync(file)
  if(isBinaryFile) { // 二进制: 默认其就是可执行文件
    exer = file
  } else { // 文本:
    const fs = require('fs')
    // 可能脚本文件编码格式不同如 ahk/bat, 但这里取第一行且是英文, 都作为 utf8 读取应该没有关系
    const lineExer = (((fs.readFileSync(file, 'utf8') + '\r\n').match(/.*[\r\n]/)[0]).trim().match(/^#\!.*[\t ](.*)$/) || [])[1] // 通过 #! 声明
    exer = lineExer
    if(!lineExer) {
       // 通过后缀名
       const path = require('path')
       const table = [
         {
           ext: ['.js'],
           exer: 'node',
         },
         {
           ext: ['.py'],
           exer: 'python',
         },
       ]
       const extExer = (table.find(item => item.ext.includes(path.extname(file))) || {}).exer
       console.log('extExerextExer', extExer)
       exer = extExer
    }
  }
  return [...new Set([exer, file])].filter(item => item && item.trim())
}

function delRequireCache(filePath) {
  delete require.cache[require.resolve(filePath)]
}

function obj2str(obj) {
  return JSON.stringify(obj, null, 2)
}

function setTitle(title) {
  if(title) {
    process.title = `qs:${title}`
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

function nodeBin(cli, dir = qsOutsideDir, useMainPackage = true) { // 查找存在于 package.bin 中的 cli, 也就是 bin 的键名, 并给出对应的路径, 键值
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

function nodeBinNoMainPackage (cli, dir = qsExtendDir) { // 从指定目录中以最大程度返回 cli 路径
  // 取值顺序:
  // - 当前目录下的同名 js 文件
  // - 同名目录中 package 中的 bin
  // - 同名目录中 package 中的 main
  // - 同名目录中 index.js
  // - 不同名目录中的 bin
  // - 不同名目录中的 main --- 不予实现, 因为大多数程序 main 中都是 index.js, 没有意义且会带来问题
  dir = qsPath(dir)
  let res // 获取到的 cli 路径
  fs.readdirSync(qsPath(dir)).map(item => path.join(dir, item)).find(item => { // 遍历当前目录

    const testJs = (new RegExp(`${cli}\\.js$`)).test(item)
    if(testJs) { // 同名 js
      return (res = item)
    }
    const sameDir = qsPath(`${dir}/${cli}`)

    if(hasFile(sameDir)) { // 如果与 cli 同名目录存在
      const sameDirIndex = qsPath(`${sameDir}/index.js`)
      const packagePath = qsPath(`${sameDir}/package.json`)
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
            return (res = qsPath(`${sameDir}/${packageMan}`))
          } else { // main 不存在时取 index
            return (res = qsPath(`${sameDir}/index.js`))
          }
        }
      }

    } else if(hasFile(qsPath(`${item}/package.json`))) { // 如果与 cli 同名目录不存在, 则在所有存在 package 的目录中找 bin
      const bin = nodeBin(cli, item, false)
      if(bin) { // 存在 package 时获取 package 中的 bin
        return (res = bin)
      }
    }

  })
  return res
}

function getFiles(dirPath, filterReStr) { // 获取指定目录下所有文件, 包含子目录
  let res = []
  function findFile(getPath) {
    let files = fs.readdirSync(getPath)
    files.forEach(function(item, index) {
      let fPath = path.join(getPath, item)
      let stat = fs.statSync(fPath)
      if (stat.isDirectory() === true) {
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
    res = res.filter(item => re.test(item))
  }
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
  qsConfigPath,
  get(keys) {
    delRequireCache(this.qsConfigPath)
    let obj = require(this.qsConfigPath)
    if(keys === undefined) {
      return obj
    }
    let res = deepGet(obj, keys, '')
    return res
  },
  set(path, value) {
    const newCfg = value ? deepSet(require(this.qsConfigPath), path, value) : path
    fs.writeFileSync(this.qsConfigPath, obj2str(newCfg), 'utf-8')
    return newCfg
  }
}

function handleRaw(rawList = []) { // 字符串数组的命令拼接为脚本文件, 使用解释器执行脚本, 返回执行器, 文件地址
  const os = require('os')
  const fs = require('fs')
  const suffix = isWin ? 'cmd' : 'sh' // 解释器和后缀名都可以使用
  const file = qsPath(`${os.tmpdir()}/qs_raw_shell_${Date.now()}.${suffix}`)
  fs.writeFileSync(file, rawList.join('\n'))
  return [...(isWin ? [suffix, '/c'] : [suffix]), file]
}

async function cmdToArr(cmd) {
  const {stdout} = await execAsync(`node ${qsPath('./util/getArgv.js')} getArgv_json ${cmd}`)
  return Array.isArray(cmd) ? cmd : JSON.parse(stdout)
}

function spawnWrap(cmd, option = {}, other = {}) { // 可以进行交互
  option = option || {stdio: 'inherit'}
  return new Promise(async (resolve, reject) => {
    const [arg1, ...argv] = await cmdToArr(cmd)
    // win 下使用 spawn 需要使用 cmd /c , 例 `spawn('cmd', ['/c', 'dir'])`, 不能 spawn('dir')
    // other.send 存在时用于 ipc 传值, 此时不能使用 cmd /c, 只能使用 node , 否则传值失败
    const _arg1 = (isWin && (other.send === undefined)) ? 'cmd' : arg1
    const _argv = [...((isWin && (other.send === undefined)) ? ['/c', arg1, ...argv] : argv)]
    const sp = child_process.spawn(
      _arg1,
      _argv,
      {
        stdio: 'inherit',
        ...option,
      }
    )

    sp.send && other.send && sp.send(other.send)
    sp.on('error', err => {
      // 查看错误码对应的信息: http://man7.org/linux/man-pages/man3/errno.3.html
      delete err.stack
      print(err)
      resolve()
    })

    sp.on('close', (code) => {
      resolve()
    })

  })
}

function execAsync(cmd, option = {}, other = {}) { // 同步运行, 不能实时输出
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, {
      stdio: 'inherit',
      ...option,
    }, (error, stdout, stderr) => {
      resolve({error, stdout, stderr})
    });
  })
}

function print(info) { // 用于输出有用信息, 而不是调试信息
  const type = typeof(info)
  type === 'undefined' && PRINT.log('')
  type === 'string' && PRINT.log(info)
  type === 'object' && PRINT.log(inspect(info || '', false, null, true))
}

function resetLog() { // 重写 console.log 方法, 打印时附带日期, 所在行
  const log = console.log
  console._log = log
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

function cleanArgs (obj, cb) { // Options for paraing user input
  const args = {}
  obj.options && obj.options.forEach(o => {
    const long = o.long.replace(/^--/, '')
    const key = long.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
    if (typeof obj[key] !== 'function' && typeof obj[key] !== 'undefined') {
      // args[long] = obj[key]
      args[key] = obj[key]
    }
  })
  if(obj2str(args) !== '{}') {
    cb && cb(args)
    return args
  } else {
    return undefined
  }
}

function list(val) {
  return val.split(',').filter(item => item)
}

module.exports = async () => {
  resetLog()
  return {
    setTitle,
    getExer,
    isWin,
    delRequireCache,
    obj2str,
    qsDataDir,
    qsExtendDir,
    qsOutsideDir,
    qsTaskPath,
    qsConfigPath,
    cfg,
    dateFormater,
    findNextMin,
    createFileOrDir,
    nodeBin,
    nodeBinNoMainPackage,
    execAsync,
    spawnWrap,
    print,
    qsPath,
    hasFile,
    handleRaw,
  }
}
