const qsPath = require(`${__dirname}/qsPath.js`)
function hasFile(filePath) {
  const fs = require('fs')
  return fs.existsSync(qsPath(filePath))
}
module.exports = hasFile
