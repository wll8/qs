function qsPath(addr = '', relativePath = `${__dirname}/../`) { // 相对于主程序的的路径, 修改使用第2个参数修改主程序位置
  const {normalize, resolve} = require('path')
  addr = [relativePath].concat(Array.isArray(addr) ? addr : [addr])
  return normalize(resolve(...addr))
}

module.exports = qsPath
