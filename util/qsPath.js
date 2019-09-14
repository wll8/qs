function qsPath(addr = '') { // 相对于 qs 主程序的的路径
  const dirname = require.main.filename.replace('index.js', '')
  const {normalize, resolve} = require('path')
  addr = [dirname].concat(Array.isArray(addr) ? addr : [addr])
  return normalize(resolve(...addr))
}

module.exports = qsPath
