const shelljs = require('shelljs')
const util = require('../util.js')
const path = require('path')

module.exports = async (arg) => {
  const isChina = await util.isChina()
  const moduleManage = isChina ? 'cnpm' : 'npm'
  CFG.set('isChina', isChina)
  CFG.set('moduleManage', moduleManage)

  if(shelljs.exec(`${moduleManage} -v`, {silent:true}).stdout) {
    // installation dependency
    const installFunction = CFG.get().installFunction
    for (let index = 0; index < installFunction.length; index++) {
      const element = installFunction[index];
      require('child_process').execFileSync(moduleManage, ['i', '-S'], { // Real-time display of output information
        cwd: path.join(__dirname, element),
        stdio: 'inherit'
      })
    }

  }
}

