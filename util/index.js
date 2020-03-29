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

function nodeBin(cli, dir = './other/') {
  const binObj = {}
  const dependencies = require(qsPath(`${dir}package.json`)).dependencies
  for (const pkgName in dependencies) {
    if (dependencies.hasOwnProperty(pkgName)) {
      const package = require(qsPath(`${dir}node_modules/${pkgName}/package.json`))
      const pkgBin = package.bin
       if(typeof(pkgBin) === 'string') {
         binObj[package.name] = pkgBin
         binObj[package.name + '_pkgName'] = pkgName
       }
       if(typeof(pkgBin) === 'object') {
         for (const key2 in pkgBin) {
           if (pkgBin.hasOwnProperty(key2)) {
             binObj[key2] = pkgBin[key2]
             binObj[key2 + '_pkgName'] = pkgName
           }
         }
       }
    }
  }
  const pkgName = binObj[cli + '_pkgName']
  return pkgName && qsPath(`${dir}/node_modules/${pkgName}/${binObj[cli]}`)
}

function createFileOrDir(filepath, str) { // Create file. If there is `/` after the path, it is considered a directory.
  const shelljs = require('shelljs')
  filepath = filepath.replace(/\\/g, '/')
  if(filepath.match(/\/$/)) { // Create directory
    shelljs.mkdir('-p', filepath)
  } else { // Create directory and file
    shelljs.mkdir('-p', filepath.split('/').slice(0, -1).join('/'))
    fs.writeFileSync(filepath, str, 'utf8')
  }
}


function deepGet(object, path, defaultValue) { // todo: bug, When using path, a value can be converted to fales, undefined is obtained
  return (
    !Array.isArray(path)
    ? path.replace(/\[/g, '.').replace(/\]/g, '').split('.')
    : path
  ).reduce((o, k) => (o || {})[k], object) || defaultValue;
}

function deepSet(obj, path, value) {
  if (Object(obj) !== obj) return obj;
  if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
  path.slice(0, -1).reduce((a, c, i) =>
    Object(a[c]) === a[c]
      ? a[c]
      : a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1]
        ? []
        : {},
    obj)[path[path.length - 1]] = value;
  return obj;
}

const cfg = {
  qsConfig: qsPath('./config.json'),
  get get() {
    return require(this.qsConfig)
  },
  set(path, value) {
    const newCfg = deepSet(require(this.qsConfig), path, value)
    fs.writeFileSync(this.qsConfig, JSON.stringify(newCfg, null, 2), 'utf-8')
    return newCfg
  }
}

function isChina() {
  const isChina = cfg.get.isChina
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

module.exports = async () => {
  return {
    cfg,
    dateFormater,
    createFileOrDir,
    nodeBin,
    isChina,
    execFileSync,
    hasModules,
    execAsync,
    spawnWrap,
    print,
    qsPath,
  }
}
