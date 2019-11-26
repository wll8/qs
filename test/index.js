const util = require('./util.js')

with (util) {
  allTestBefore()

  after(() => {
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
          execSync(cmd).includes('查找任务时使用精确匹配')
        )
      }))
    })
    describe('管道', () => {
      const findStr = uuid()
      const options = [
        isWindows
          ? `echo {"a": ${findStr}}|qs json a`
          : `echo '{"a": ${findStr}}'|qs json a`,
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
    describe('停止任务', () => { // describe 不支持 async, 也不支持使用 setTimeout 改写
      let options = [
        'qs -k ${taskId}',
        'qs --task-kill ${taskId}',
      ]
      options.forEach(item => it(item, async () => {
        let tempCmd = `qs --task-show-id -n ${uuid()} ping localhost`
        spawn(tempCmd.split(' '))
        await sleep()
        let taskId = requireUncached(taskFile).find(item => item.cmd.includes(tempCmd)).taskId
        await sleep()
        execSync(item.replace('${taskId}', taskId))
        await sleep()
        execSync(`qs --task`) // 刷新任务列表
        await sleep()
        assert.ok(requireUncached(taskFile).find(item => item.cmd.includes(tempCmd)).status === 'stoped')
      }))
    })
    describe('删除任务', () => {
      {
        let tempCmd = `qs --task-show-id -n ${uuid()} echo 123`
        let taskId = execSync(tempCmd).match(/taskId: (\d+)/)[1]
        const options = [
          `qs --task-remove ${taskId}`,
        ]
        options.forEach(cmd => it(cmd, () => {
          let res = execSync(cmd)
          assert.ok(
            requireUncached(taskFile).some(item => item.cmd.includes(tempCmd)) === false
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
          assert.ok(execSync(`qs --config`).includes(num))
        })
      }
      {
        let id = uuid()
        execSync(`qs --config taskRecord=${id}`)
        let cmd = `qs --config-reset`
        it(cmd, () => {
          execSync(cmd)
          assert.ok(execSync(`qs --config taskRecord`).includes(id) === false)
        })
      }
    })
  })

}
