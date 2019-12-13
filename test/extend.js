const util = require('./util.js')

with(util) {
  describe('扩展功能', () => {
    describe('js 脚本 && package.json 中定义的脚本', () => {
      it('当前目录下的同名 js 文件', () => {
        let name = uuid()
        let path = absPath(`${qsExtendDir}/${name}.js`)
        fs.writeFileSync(path, `console.log(${name})`)
        assert.ok(
          execSync(`qs ${name}`).includes(name)
        )
      })
      it('同名目录中 package 中的 bin', () => {
        let name = uuid()
        let path = absPath(`${qsExtendDir}/${name}`)
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
        assert.ok(
          execSync(`qs a${name}`).includes('aaa')
        )
        assert.ok(
          execSync(`qs b${name}`).includes('bbb')
        )
      })
      it('同名目录中 package 中的 main', () => {
        let dirName = uuid()
        let path = absPath(`${qsExtendDir}/${dirName}`)
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/m.js`, `console.log('mmm')`)
        fs.writeFileSync(`${path}/package.json`, `
          {
            "main": "m.js"
          }
        `)
        assert.ok(
          execSync(`qs ${dirName}`).includes('mmm')
        )
      })
      it('bin 的优先级大于 man', () => {
        let name = uuid()
        let path = absPath(`${qsExtendDir}/${name}`)
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
        assert.ok(
          execSync(`qs ${name}`).includes('aaa')
        )
      })
      it('同名目录中 index.js', () => {
        let name = uuid()
        let path = absPath(`${qsExtendDir}/${name}`)
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/index.js`, `console.log(${name})`)
        assert.ok(
          execSync(`qs ${name}`).includes(name)
        )
      })
      it('不同名目录中的 bin', () => {
        let name = uuid()
        let path = absPath(`${qsExtendDir}/${uuid()}`) // 随机目录
        shelljs.mkdir(path)
        fs.writeFileSync(`${path}/a.js`, `console.log('aaa')`)
        fs.writeFileSync(`${path}/package.json`, `
          {
            "bin": {
              "${name}": "a.js"
            }
          }
        `)
        assert.ok(
          execSync(`qs ${name}`).includes('aaa')
        )
      })
    })
    describe('参数接收', () => {
      const name = uuid()
      const cmd = `qs ${name} ${name}`
      it(cmd, () => {
        let path = absPath(`${qsExtendDir}/${name}.js`)
        fs.writeFileSync(path, `console.log(process.argv)`)
        assert.ok(
          execSync(cmd).includes(name)
        )
      })
    })
    describe('按照 config.exer 配置的方式运行脚本', () => {
      {
        const name = uuid()
        const cmd = `qs ${name}`
        it(cmd, () => {
          let path = absPath(`${qsExtendDir}/${name}.py`)
          fs.writeFileSync(path, `print ${name}`)
          assert.ok(
            execSync(cmd).includes(name)
          )
        })
      }
      {
        const name = uuid()
        const cmd = `qs ${name}`
        it(`${cmd} 运行 sh 或 bat`, () => {
          let path = absPath(`${qsExtendDir}/${name}${isWin ? '.bat' : '.sh'}`)
          fs.writeFileSync(path, `echo ${name}`)
          assert.ok(
            execSync(cmd).includes(name)
          )
        })
      }
      {
        const name = uuid()
        const cmd = `qs ${name}`
        if(isWin === false) {
          it(`${cmd} 修改 exer 为其他解释器`, () => {
            shelljs.sed('-i', `"exer": "sh"`, `"exer": "bash"`, configFile)
            let path = absPath(`${qsExtendDir}/${name}.sh`)
            fs.writeFileSync(path, `echo ${name}`)
            assert.ok(
              execSync(cmd).includes(name)
            )
          })
        }
      }
      {
        const name = uuid()
        const cmd = `qs ${name}`
        it(`${cmd} 修改 exer 为绝对路径`, () => {
          const nodePath = String(shelljs.which('node')).replace(/\\/g, '\\\\') // 转换 win 上路径 \ 为 \\
          shelljs.sed('-i', `"exer": "node"`, `"exer": "${nodePath}"`, configFile)
          let path = absPath(`${qsExtendDir}/${name}.js`)
          fs.writeFileSync(path, `console.log(${name})`)
          assert.ok(
            execSync(cmd).includes(name)
          )
        })
      }
      {
        const name = uuid()
        const cmd = `qs ${name}`
        it(`${cmd} 新增扩展名与解释器关联`, () => {
          shelljs.sed('-i', `".js"`, `".js",".newExt"`, configFile)
          let path = absPath(`${qsExtendDir}/${name}.newExt`)
          fs.writeFileSync(path, `console.log(${name})`)
          assert.ok(
            execSync(cmd).includes(name)
          )
        })
      }
    })
    describe('访问 global.qs', () => {
      let name = uuid()
      let cmd = `qs -a ${name}`
      it(cmd, async () => {
        let path = absPath(`${qsExtendDir}/${name}.js`)
        fs.writeFileSync(path, `
          new Promise(async () => {
            console.log('getCurlTaskId', await global.qs.task.getCurlTaskId())
          })
        `)
        assert.ok(
          execSync(cmd).match(/getCurlTaskId \d+/) !== null)
      })
    })
    describe('使用 npmjs 安装的程序', () => {
      const options = [
        `qs gitday --help`,
        `qs hs --help`,
      ]
      it(options.join(' '), async () => {
        execSync(`cd ${qsExtendDir} && ${packgeAdmin} init -y && ${packgeAdmin} i -S wll8/gitday http-server`)
        const res1 = execSync(options[0], false).includes('作者')
        const res2 = execSync(options[1], false).includes('option')
        assert.ok(
          res1 && res2
        )
      })
    })
  })
}
