const fs = require('fs')
const path = require('path')
const os = require('os')
const QS_PATH = global.QS.QS_PATH

module.exports = async (arg) => {
  const {template} = arg
  const filePath = QS_PATH(`./core/${template}.js`)
  if(fs.existsSync(filePath)) {
    require(filePath)(arg)
  }
}

