const fs = require('fs')
const path = require('path')
const os = require('os')
const {
  qsPath,
  print,
} = global.qs.util

module.exports = async (arg) => {
  const {template} = arg
  const filePath = qsPath(`./template/${template}Render.js`)
  print(filePath)
  if(fs.existsSync(filePath)) {
    require(filePath)(arg)
  }
}

