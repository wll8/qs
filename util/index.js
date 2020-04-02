logHelper()
const shelljs = require('shelljs')
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
  qsDataDir,
  qsConfigPath,
  qsTaskPath,
} = require(qsPath('./util/init.js')).initFile()


const PRINT = new Console({ stdout: process.stdout, stderr: process.stderr })

async function autoInstallPackage (bin) {
  // 如果扩展目录存在 package.json 且存在 dependencies 但没有 node_modules 时, 自动安装依赖
  const {
    util: {
      qsExtendDir,
      run,
      hasFile,
      cfg,
      qsPath,
    },
  } = global.qs
  let re =  new RegExp(`${qsExtendDir}/(.*?)/`)
  let dirName = (bin.match(re) || [])[1]
  if(dirName) {
    let package = qsExtendDir + '/' + dirName + '/package.json'
    let node_modules = qsExtendDir + '/' + dirName + '/node_modules'

    if(hasFile(package) && require(package).dependencies && !hasFile(node_modules)) { // 自动安装依赖
      let cmd = `${cfg.get('moduleManage')} i --production`
      await run.spawnWrap(cmd, [{cwd: qsPath(qsExtendDir + '/' + dirName)}])
    }
  }
}

async function runCmd({
  bin,
  binArg1,
}) {
  const {
    binArgMore,
    util: {
      getType,
      run,
      qsExtendDir,
      obj2str,
      getExer,
      path,
    },
    argParse,
    argParse: {
      exerArg,
      taskAdd,
    },
  } = global.qs
  const defaultArg = [{cwd: process.cwd()}]

  if(bin) { // 运行 ext 目录中的程序, 脚本与解释器请参考 config.exer
    let exer = getExer(bin) || ''
    let exerArgArr = []
    let runMainEd = false // 是否经过 runMain 方法
    if(
      (Boolean(exer) === false) // 如果解释器 exer 不存在, 则把 bin 作为解释器运行, 移除 bin
      || (exer.toLowerCase() === bin.toLowerCase()) // 如果解释器与命令是同一文件时, 则保留 exer, 移除 bin
    ) {
      exer = bin
      bin = ''
    }
    if(exerArg) {
      // 转换字符串参数为数组, 供 spawnWrap 使用
      exerArgArr = (Array.isArray(exerArg) ? exerArg : [exerArg]).reduce((acc, arg) => {
        return acc.concat(arg.split(/\s+/))
      }, [])
      exer = [exer, ...exerArgArr, bin]
    }
    if(Boolean(exerArg) === false && /^node(|\.exe)$/i.test(path.basename(exer))) { // 无需启动 node 执行 js 程序
      const Module = require('module')
      if (obj2str(argParse) === '{}') {
        require('yargs').reset()
      }
      process.argv = [
        process.argv[0],
        bin // node 脚本路径。 `runMain()`会将其设置为新的 main
      ].concat(binArgMore) // 脚本的其他选项
      { // 还原 log 重写 并运行 runMain
        Module.runMain()
      }
      runMainEd = true
    }
    const spawnWrapArgv = [
      ...(getType(exer, 'array') ? exer : [exer, bin]),
      ...binArgMore,
    ].filter(item => item !== '')
    runMainEd === false && await run.spawnWrap(
      spawnWrapArgv,
      defaultArg,
      taskAdd,
    )
  } else { // 移交命令和参数给系统, 让系统去执行, 例 `qs echo 123`
    process.env.PATH = `${qsExtendDir}${path.delimiter}${process.env.PATH}`
    await run.spawnWrap([binArg1, ...binArgMore], defaultArg, taskAdd)
    return process.exit()
  }

}

function findBin(binName) { // 查找 ext 目录中的可执行路径, 结果可能是脚本或二进制
  const {
    util: {
      print,
      cfg,
      isWin,
      qsExtendDir,
      nodeBin,
      hasFile,
      qsPath,
      nodeBinNoMainPackage,
    },
  } = global.qs

  { // 查找不存在于 package.json 中的程序, 主要是 js 或 package.json 的 bin 字段指定的文件
    let bin = nodeBinNoMainPackage(binName)
    if(bin) {
      return {
        type: 'file',
        bin,
      }
    }
  }
  { // 以 ext/package.json 查找 package.dependencies 中的程序
    const package = qsPath(`${qsExtendDir}/package.json`)
    const hasDependencies = hasFile(package) && require(package).dependencies
    const hasNodeModules = hasFile(`${qsExtendDir}/node_modules`)
    if(hasDependencies && hasNodeModules) {
      let bin = nodeBin(binName)
      if(bin) {
        return {
          type: 'node_modules',
          bin,
        }
      }
    }
    if(hasDependencies && (hasNodeModules === false)) {
      print('package.dependencies 中的程序似乎没有安装')
    }
  }
  { // 查找 ext 目录下的脚本文件
    let configExtList = cfg.get('exer').map(item => item.ext)
    while (configExtList.some(Array.isArray)) {
      configExtList = [].concat(...configExtList)
    }
    const extList = (process.env.PATHEXT || '').toLocaleLowerCase().split(';').concat(configExtList)
    for (let index = 0; index < extList.length; index++) {
      const ext = extList[index]
      const bin = qsPath(`${qsExtendDir}/${binName}${ext}`)
      if(hasFile(bin)) {
        return {
          type: 'ext',
          bin,
        }
      }
    }
  }
  { // win 下查询 *.lnk
    if(isWin) {
      const lnk = qsPath(`${qsExtendDir}/${binName}.lnk`)
      if(hasFile(lnk)) {
        return {bin: lnk}
      }
    }
  }
  { // 如果没有找到 js 可以处理的程序, 则返回空对象
    return {}
  }
}

function getType(data, type) {
  const dataType = Object.prototype.toString.call(data).replace(/(.* )(.*)\]/, '$2').trim().toLowerCase()
  return type ? (dataType === type.trim().toLowerCase()) : dataType
}
class QsError extends Error {
  constructor({code, msg}) {
    super({code, msg})
    this.code = code
    this.msg = msg
    this.stack = (new Error()).stack
  }
}

function getExer(file) { // 获取脚本的执行器
  // - 通过配置的后缀获取
  // - 二进制自身
  // - 通过 #! 声明获取
  // - 移交系统执行策略
  let exer = undefined
  const findMethodList = [
    file => { // 配置后缀
      const table = cfg.get('exer')
      const exer = (table.find(item => item.ext.includes(path.extname(file))) || {}).exer
      return exer
    },
    file => { // 二进制: 默认其就是可执行文件
      const exer = require(qsPath('./lib/isBinaryFile.js')).isBinaryFileSync(file) ? file : undefined
      return exer
    },
    file => { // 文本形式
      const fs = require('fs')
      // 可能脚本文件编码格式不同如 ahk/bat, 但这里取第一行且是英文, 都作为 utf8 读取应该没有关系
      const exer = (((fs.readFileSync(file, 'utf8') + '\r\n')
        .match(/.*[\r\n]/)[0])
        .trim()
        .match(/^#\!.*[\t ](.*)$/) || [])[1] // 通过 #! 声明
      return exer
    },
  ]

  findMethodList.some(fn => {
    exer = fn(file)
    return exer
  })

  if(exer) { // 获取执行器的绝对路径
    exer = String(shelljs.which(exer) || '')
  }
  return exer
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

function nodeBin(cli, dir = qsExtendDir, useMainPackage = true) { // 查找存在于 package.bin 中的 cli, 也就是 bin 的键名, 并给出对应的路径, 键值
  // useMainPackage: true, 从给定目录的 package.dependencies 所涉及到的 node_modules 中去查找 bin
  // useMainPackage: false, 已经知道 cli 所在的 package.json 目录, 不再从 node_modules 中查找

  let binObj = {}
  const getBin = (pkgName, package) => { // pkgName 是包名, 如包名为 fkill-cli 的 bin 是 fkill, node_modules 下的是 fkill-cli, 命令行中运行的是 fkill
    const pkgBin = package.bin
    if(getType(pkgBin, 'string')) {
      binObj[package.name] = pkgBin
      binObj[package.name + '_pkgName'] = pkgName
    } else if(getType(pkgBin, 'object')) {
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
  if(filepath.match(/\/$/)) { // Create directory
    shelljs.mkdir('-p', filepath)
  } else { // Create directory and file
    shelljs.mkdir('-p', filepath.split('/').slice(0, -1).join('/'))
    fs.writeFileSync(filepath, str, 'utf8')
  }
}


function deepGet(object, keys, defaultValue) {
  let res = (!Array.isArray(keys)
    ? keys
      .replace(/\[/g, '.')
      .replace(/\]/g, '')
      .split('.')
    : keys
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
  const {stdout} = await execWrap(`node ${qsPath('./util/getArgv.js')} getArgv_json ${cmd}`)
  return Array.isArray(cmd) ? cmd : JSON.parse(stdout)
}

function spawnWrap(cmd, option = {}, other = {}) { // 可以进行交互
  option = option || {stdio: 'inherit'}
  return new Promise(async (resolve, reject) => {
    const [arg1, ...argv] = await cmdToArr(cmd)
    // win 下使用 spawn 需要使用 cmd /c , 例 `spawn('cmd', ['/c', 'dir'])`, 不能 spawn('dir')
    const _arg1 = isWin ? 'cmd' : arg1
    const _argv = [...(isWin ? ['/c', arg1, ...argv] : argv)]
    const sp = child_process.spawn(
      _arg1,
      _argv,
      {
        stdio: 'inherit',
        ...option,
      }
    )

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

function execWrap(cmd, option = {}, other = {}) { // 同步运行, 不能实时输出
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
  const type = getType(info)
  return [
    ['undefined', () => PRINT.log('')],
    ['string', 'number', () => PRINT.log(info)],
    ['object', 'error', 'array', () => PRINT.log(inspect(info || '', false, null, true))],
  ].forEach(item => item.slice(0, -1).includes(type) && item.slice(-1)[0]())
}

function logHelper(isUse = true) { // 重写 console.log 方法, 打印时附带日期, 所在行
  if(isUse === false) {
    console.log = console._log ? console._log : console.log
    return
  }
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
    if( // 重写时忽略的调用栈路径
      line.match(/node_modules/)
      || line.match(/\.qs/)
    ) {
      log(...arg)
      return undefined
    } else {
      log(new Date().toLocaleString())
      log(`> ${line}`)
      log(...arg)

      // log.apply(console, [
      //   new Date().toLocaleString(),
      //   '\r\n',
      //   line,
      //   '\r\n',
      //   ...arg,
      // ])
    }
  }
}

function cleanArgs (obj, cb) { // Options for paraing user input
  const args = {}
  obj.options && obj.options.forEach(o => {
    const long = o.long.replace(/^--/, '')
    const key = long.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
    if (getType(obj[key]) !== 'function' && getType(obj[key]) !== 'undefined') {
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
  return {
    runCmd,
    findBin,
    getType,
    path,
    shelljs,
    QsError,
    setTitle,
    getExer,
    isWin,
    delRequireCache,
    obj2str,
    qsDataDir,
    qsExtendDir,
    qsTaskPath,
    qsConfigPath,
    cfg,
    dateFormater,
    findNextMin,
    createFileOrDir,
    nodeBin,
    nodeBinNoMainPackage,
    execWrap,
    spawnWrap,
    print,
    qsPath,
    hasFile,
    handleRaw,
  }
}
