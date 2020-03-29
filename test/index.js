const util = require('./util.js')

with (util) {
  allTestBefore()

  after(() => {
    console.log('测试完成')
    allTestAfter()
  })
  describe('基本功能', () => {
    describe('显示版本号', () => {
      const version = require(absPath('../package.json')).version
      const options = ['qs -v', 'qs --vers', 'qs --version']
      options.forEach(cmd => it(cmd, () => {
        assert.ok(
          execSync(cmd).includes(version)
        )
      }))
    })
    describe('显示帮助信息', () => {
      const options = ['qs', 'qs -h', 'qs --help']
      options.forEach(cmd => it(cmd, () => {
        assert.ok(
          execSync(cmd, false).includes('显示版本号', false)
        )
      }))
    })
    describe('管道', () => {
      const findStr = uuid()
      const options = [
        isWin
          ? `echo {"a": ${findStr}}|qs npx json a`
          : `echo '{"a": ${findStr}}'|qs npx json a`,
      ]
      options.forEach(cmd => it(cmd, () => {
        assert.ok(
          execSync(cmd).includes(findStr)
        )
      }))
    })
    describe('以字符串形式运行', () => {
      {
        const options = [
          'qs -r "echo 123"',
          'qs --rawCmd "echo 123"'
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes('123')
          )
        }))
      }
      {
        const options = [
          'qs -r "echo 123" "echo 456"',
          'qs --rawCmd "echo 123" "echo 456"',
          'qs -r "echo 123" -r "echo 456"',
          'qs --rawCmd "echo 123" --rawCmd "echo 456"',
          'qs --rawCmd "echo 123 && echo 456"',
        ]
        options.forEach(cmd => {
          it(cmd, () => {
            let res = execSync(cmd)
            assert.ok(
              res.includes('123') && res.includes('456')
            )
          })
        })
      }

    })
    describe('添加到任务记录', () => {
      {
        const options = [
          'qs --task-show-id -a echo 123',
          'qs --task-show-id --task-add echo 123',
          'qs --task-show-id -d taskDes echo 123',
          'qs --task-show-id --task-des taskDes echo 123',
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes('taskId:')
          )
        }))
      }
      {
        const taskName = uuid()
        execSync(`qs -n ${taskName} echo 123`)
        const options = [
          `qs --task-name ${taskName} echo 123`,
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes('相同任务名称或ID')
          )
        }))
      }
    })
    describe('以字符串形式运行 && 添加到任务记录', () => {
      {
        const options = [
          'qs --task-show-id -a -r "echo 123"',
          'qs --task-show-id -a --rawCmd "echo 123"',
          'qs --task-show-id --task-add -r "echo 123"',
          'qs --task-show-id --task-add --rawCmd "echo 123"',
          'qs --task-show-id -d taskDes -r "echo 123"',
          'qs --task-show-id --task-des taskDes --rawCmd "echo 123"',
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes('taskId:')
          )
        }))
      }
      {
        const taskName = uuid()
        execSync(`qs -n ${taskName} -r "echo 123"`)
        const options = [
          `qs --task-name ${taskName} -r "echo 123"`,
          `qs --task-name ${taskName} --cmd-raw "echo 123"`,
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes('相同任务名称或ID')
          )
        }))
      }
    })
    describe('运行任务时增加参数', () => {
      {
        const taskName = uuid()
        execSync(`qs -n ${taskName} echo 123`)
        const options = [
          `qs -s ${taskName} 456`,
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes('123 456')
          )
        }))
      }
    })
    describe('启动任务', () => {
      {
        let findStr = '123'
        let taskId = execSync(`qs --task-show-id -a echo ${findStr}`).match(/taskId: (\d+)/)[1]
        const options = [
          `qs -s ${taskId}`,
          `qs --task-start ${taskId}`,
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes(findStr)
          )
        }))
      }
      {
        let findStr = '123'
        let taskName = uuid()
        execSync(`qs --task-show-id -n ${taskName} echo ${findStr}`).match(/taskId: (\d+)/)[1]
        const options = [
          `qs -s ${taskName}`,
          `qs --task-start ${taskName}`,
        ]
        options.forEach(cmd => it(cmd, () => {
          assert.ok(
            execSync(cmd).includes(findStr)
          )
        }))
      }
    })
    describe('查找任务、查看任务列表', () => {
      {
        let taskName = uuid()
        execSync(`qs -n ${taskName} echo ${taskName}`)
        let cmd = `qs --task taskName=${taskName}`
        it(cmd, () => {
          assert.ok(
            execSync(cmd, false).includes(taskName)
          )
        })
      }
      {
        let taskName = uuid()
        execSync(`qs -n ${taskName} echo ${taskName}`)
        let cmd = `qs --task`
        it(cmd, () => {
          assert.ok(
            execSync(cmd, false).includes(taskName)
          )
        })
      }
      {
        let taskName = uuid()
        execSync(`qs -n ${taskName}1 echo ${taskName}`)
        execSync(`qs -n ${taskName}2 echo ${taskName}`)
        execSync(`qs -n ${taskName}3 echo ${taskName}`)
        let cmd = `qs --regexp=false --task taskName=${taskName}1`
        it(`${cmd} 精确查找任务`, () => {
          assert.ok(
            (execSync(cmd).match(/execList/g) || []).length === 1
            && (execSync(`qs --task taskName=${taskName}`).match(/execList/g) || []).length === 3
          )
        })
      }
    })
    describe('停止任务', () => { // describe 不支持 async, 也不支持使用 setTimeout 改写
      let options = [
        'qs -k ${taskId}',
        'qs --task-kill ${taskId}',
      ]
      options.forEach(item => it(item, async () => {
        let taskName = uuid()
        let tempCmd = isWin ? `cmd /c qs -n ${taskName} ping localhost -t` : `qs -n ${taskName} ping localhost`
        spawn(tempCmd.split(' '))
        await sleep()
        let taskId = requireUncached(taskFile).find(item => item.taskName && item.taskName.includes(taskName)).taskId
        await sleep()
        execSync(item.replace('${taskId}', taskId))
        await sleep()
        execSync(`qs --task`, {}, false) // 刷新任务列表
        await sleep()
        assert.ok(
          requireUncached(taskFile).find(item => item.taskName && item.taskName.includes(taskName)).status === 'stoped'
        )
      }))
    })
    describe('删除任务', () => {
      {
        let taskName = uuid()
        let tempCmd = `qs --task-show-id -n ${taskName} echo 123`
        let taskId = execSync(tempCmd).match(/taskId: (\d+)/)[1]
        const options = [
          `qs --task-remove ${taskId}`,
        ]
        options.forEach(cmd => it(cmd, () => {
          let res = execSync(cmd)
          assert.ok(
            requireUncached(taskFile).some(item => item.taskName && item.taskName.includes(taskName)) === false
          )
        }))
      }
      {
        let taskName = uuid()
        let tempCmd = `qs --task-show-id -n ${taskName} echo 123`
        let taskId = execSync(tempCmd).match(/taskId: (\d+)/)[1]
        const options = [
          `qs --task-remove ${taskName}`,
        ]
        options.forEach(cmd => it(cmd, () => {
          let res = execSync(cmd)
          assert.ok(
            requireUncached(taskFile).some(item => item.taskName === taskName) === false
          )
        }))
      }
    })
    describe('查看、修改配置', () => {
      {
        let cmd = `qs --config`
        it(cmd, () => {
          assert.ok(
            execSync(cmd).includes('taskRecord')
          )
        })
      }
      {
        let cmd = `qs --config taskRecord`
        it(cmd, () => {
          assert.ok(
            execSync(cmd) !== ''
          )
        })
      }
      {
        let num = uuid()
        let cmd = `qs --config taskRecord=${num}`
        it(cmd, () => {
          execSync(cmd)
          assert.ok(
            execSync(`qs --config`).includes(num)
          )
        })
      }
      {
        let id = uuid()
        execSync(`qs --config taskRecord=${id}`)
        let cmd = `qs --config-reset`
        it(cmd, () => {
          execSync(cmd)
          assert.ok(
            execSync(`qs --config taskRecord`).includes(id) === false
          )
        })
      }
    })
    describe('查看命令路径', () => {
      {
        const name = uuid()
        const cmd = `qs --which ${name}`
        it(`${cmd} ext 目录命令路径`, () => {
          let path = absPath(`${qsExtendDir}/${name}.js`)
          fs.writeFileSync(path, `console.log(${name})`)
          assert.ok(
            execSync(cmd).includes(path)
          )
        })
      }
      {
        const cmd = `qs --which node`
        it(`${cmd} 系统中命令路径`, () => {
          assert.ok(
            execSync(cmd).includes(String(shelljs.which('node') || ''))
          )
        })
      }
    })
  })

}
