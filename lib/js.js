const fs = require('fs')
const path = require('path')
const os = require('os')
const shelljs = require('shelljs')
const { log } = console

// Directory of resources
const baseDir = `${os.homedir()}/.qs/js/`

// Initialization template
const template = {
js: `\
;(async () => {
const {log} = console
log(new Date().toLocaleString())

})();
`,
ts: `\
// ts
`,
coffee: `\
// coffee
`,
}
// Programs used to open files
const openExe = 'code'

module.exports = (arg) => {
  const type = arg.fileName.replace(/.*\.(.*)$/, '$1') // Get the file name suffix
  const date = dateFormater('YYYYMMDDHHmmss', new Date())
  const fileDir = baseDir + date + '/'
  const fileName = fileDir + arg.fileName
  log(fileName)
  createFileOrDir(fileName, template[type] || '')

  if(arg.openDir) {
    shelljs.exec(`${openExe} ${fileDir}`)
    shelljs.exec(`${openExe} ${fileName}`)
  } else {
    shelljs.exec(`${openExe} ${fileName}`)
  }

  const nodemonCommand = `node ${path.join(__dirname,'../node_modules/nodemon/bin/nodemon.js')}`
  shelljs.exec(`${nodemonCommand} -q --watch "${fileName}" --exec "node ${fileName}"`)
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

function createFileOrDir(filepath, str) { // Create file. If there is `/` after the path, it is considered a directory.
  if(filepath.match(/\/$/)) { // Create directory
    shelljs.mkdir('-p', filepath)
  } else { // Create directory and file
    shelljs.mkdir('-p', filepath.split('/').slice(0, -1).join('/'))
    fs.writeFileSync(filepath, str, 'utf8')
  }
}
