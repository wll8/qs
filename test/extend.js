const util = require('./util.js')

with(util) {
  describe('扩展功能', () => {
    describe('extend 目录扩展', () => {
      it('当前目录下的同名 js 文件', () => {
        let name = uuid()
        let path = absPath(`${extendDir}/${name}.js`)
        fs.writeFileSync(path, `console.log(${name})`)
        assert.ok(execSync(`qs ${name}`).includes(name))
      })
      it('同名目录中 package 中的 bin', () => {
        let name = uuid()
        let path = absPath(`${extendDir}/${name}`)
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/a.js`, `console.log('aaa')`)
        fs.writeFileSync(`${path}/b.js`, `console.log('bbb')`)
        fs.writeFileSync(`${path}/package.json`, `
          {
            "bin": {
              "a${name}": "a.js",
              "b${name}": "b.js"
            }
          }
        `)
        assert.ok(execSync(`qs a${name}`).includes('aaa'))
        assert.ok(execSync(`qs b${name}`).includes('bbb'))
      })
      it('同名目录中 package 中的 main', () => {
        let dirName = uuid()
        let path = absPath(`${extendDir}/${dirName}`)
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/m.js`, `console.log('mmm')`)
        fs.writeFileSync(`${path}/package.json`, `
          {
            "main": "m.js"
          }
        `)
        assert.ok(execSync(`qs ${dirName}`).includes('mmm'))
      })
      it('bin 的优先级大于 man', () => {
        let name = uuid()
        let path = absPath(`${extendDir}/${name}`)
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/a.js`, `console.log('aaa')`)
        fs.writeFileSync(`${path}/m.js`, `console.log('mmm')`)
        fs.writeFileSync(`${path}/package.json`, `
          {
            "main": "m.js",
            "bin": {
              "${name}": "a.js"
            }
          }
        `)
        assert.ok(execSync(`qs ${name}`).includes('aaa'))
      })
      it('同名目录中 index.js', () => {
        let name = uuid()
        let path = absPath(`${extendDir}/${name}`)
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/index.js`, `console.log(${name})`)
        assert.ok(execSync(`qs ${name}`).includes(name))
      })
      it('不同名目录中的 bin', () => {
        let name = uuid()
        let path = absPath(`${extendDir}/${uuid()}`) // 随机目录
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/a.js`, `console.log('aaa')`)
        fs.writeFileSync(`${path}/package.json`, `
          {
            "bin": {
              "${name}": "a.js"
            }
          }
        `)
        assert.ok(execSync(`qs ${name}`).includes('aaa'))
      })
      it('参数接收', () => {
        let name = uuid()
        let path = absPath(`${extendDir}/${name}.js`)
        fs.writeFileSync(path, `console.log(process.argv)`)
        assert.ok(execSync(`qs ${name} ${name}`).includes(name))
      })
      it(`require('qs') 参数导出`, async () => {
        let name = uuid()
        let path = absPath(`${extendDir}/${name}.js`)
        fs.writeFileSync(path, `
          new Promise(async () => {
            console.log('getCurlTaskId', await global.qs.task.getCurlTaskId())
          })
        `)
        assert.ok(execSync(`qs -a ${name}`).match(/getCurlTaskId \d+/) !== null)
      })
    })
    describe('outside 目录扩展', () => {
      const options = [
        `qs gitday --help`,
        `qs hs --help`,
      ]
      it(options.join(' '), async () => {
        execSync(`cd ${outsideDir} && ${packgeAdmin} init -y && ${packgeAdmin} i -S wll8/gitday http-server`)
        const res1 = execSync(options[0], false).includes('作者')
        const res2 = execSync(options[1], false).includes('option')
        assert.ok(res1 && res2)
      })
    })
  })
}
