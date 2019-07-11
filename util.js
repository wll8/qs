const fs = require('fs')
const http = require('http')
const shelljs = require('shelljs')
const path = require('path')
const os = require('os')


function getRes (url, is_down = false) {
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
          process.stdout.write(`${url.split('/').slice(-1)[0]} downloaded/total = ${data.length}/${contentLength} = ${percent}/100\r`);
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

const nodeBin = {
  // cnpm: `node ${path.join(__dirname, `/node_modules/cnpm/bin/cnpm`)}`,
  nodemon: `node ${path.join(__dirname, `/node_modules/nodemon/bin/nodemon.js`)}`,
  // json
  // http-server
  // qrcode-terminal
}

function createFileOrDir(filepath, str) { // Create file. If there is `/` after the path, it is considered a directory.
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
  get(path) {
    const cfg = require('./config.json')
    return path ? deepGet(cfg, path) : cfg
  },
  set(path, value) {
    const newCfg = deepSet(require('./config.json'), path, value)
    fs.writeFileSync('./config.json', JSON.stringify(newCfg, null, 2), 'utf-8')
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


module.exports = {
  cfg,
  dateFormater,
  createFileOrDir,
  nodeBin,
  isChina,
}
