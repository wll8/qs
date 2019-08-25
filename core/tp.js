const fs = require('fs')
const path = require('path')
const os = require('os')
const QS_PATH = global.QS.QS_PATH

module.exports = async (arg) => {
  const {template} = arg
  const filePath = QS_PATH(`./template/${template}Render.js`)
  console.log('filePath', filePath)
  if(fs.existsSync(filePath)) {
    require(filePath)(arg)
  }
}

