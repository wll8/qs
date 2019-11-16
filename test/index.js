process.env.LANG = 'zh_CN.UTF-8' // 统一语言环境, 以避免产生不同结果
const assert = require('assert')
const child_process = require('child_process')
const shelljs = require('shelljs')
const configFile = absPath('../config.json')
const taskFile = absPath('../task.json')
const isWindows = require('os').type() === 'Windows_NT'

{
  // 备份用户配置
  shelljs.cp('-f', configFile, `${configFile}.bak`)
  shelljs.cp('-f', taskFile, `${taskFile}.bak`)

  // 初始化用户配置
  execSync('qs --config-reset')
  require('fs').writeFileSync(absPath('../task.json'), '[]\n', 'utf8')
}

describe('基本功能', () => {
  after(() => {
    console.log('恢复用户配置')
    shelljs.mv('-f', `${configFile}.bak`, configFile)
    shelljs.mv('-f', `${taskFile}.bak`, taskFile)
  })

  after(async () => {
    console.log('测试完成')
  })
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
        'qs -a echo 123',
        'qs --task-add echo 123',
        'qs -d taskDes echo 123',
        'qs --task-des taskDes echo 123',
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
        'qs -a -r "echo 123"',
        'qs -a --rawCmd "echo 123"',
        'qs --task-add -r "echo 123"',
        'qs --task-add --rawCmd "echo 123"',
        'qs -d taskDes -r "echo 123"',
        'qs --task-des taskDes --rawCmd "echo 123"',
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
      let taskId = execSync(`qs -a echo ${findStr}`).match(/taskId: (\d+)/)[1]
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
      execSync(`qs -n ${taskName} echo ${findStr}`).match(/taskId: (\d+)/)[1]
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
      let tempCmd = `qs -n ${uuid()} ping localhost`
      spawn(tempCmd.split(' '))
      await sleep()
      let taskId = requireUncached(absPath('../task.json')).find(item => item.cmd.includes(tempCmd)).taskId
      await sleep()
      execSync(item.replace('${taskId}', taskId))
      await sleep()
      execSync(`qs --task`) // 刷新任务列表
      await sleep()
      assert.ok(requireUncached(absPath('../task.json')).find(item => item.cmd.includes(tempCmd)).status === 'stoped')
    }))
  })
  describe('删除任务', () => {
    {
      let tempCmd = `qs -n ${uuid()} echo 123`
      let taskId = execSync(tempCmd).match(/taskId: (\d+)/)[1]
      const options = [
        `qs --task-remove ${taskId}`,
      ]
      options.forEach(cmd => it(cmd, () => {
        let res = execSync(cmd)
        assert.ok(
          requireUncached(absPath('../task.json')).some(item => item.cmd.includes(tempCmd)) === false
        )
      }))
    }
    {
      let taskName = uuid()
      let tempCmd = `qs -n ${taskName} echo 123`
      let taskId = execSync(tempCmd).match(/taskId: (\d+)/)[1]
      const options = [
        `qs --task-remove ${taskName}`,
      ]
      options.forEach(cmd => it(cmd, () => {
        let res = execSync(cmd)
        assert.ok(
          requireUncached(absPath('../task.json')).some(item => item.taskName === taskName) === false
        )
      }))
    }
  })
  describe('查看、修改配置', () => {
    {
      let cmd = `qs --config`
      it(cmd, () => {
        assert.ok(
          execSync(cmd).includes('openExe')
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
function execSync(cmd, out = true) {
  let str = child_process.execSync(cmd).toString().trim()
  out && console.log(str)
  return str
}
function spawn(arr, option = {}) {
  let [arg1, ...argMore] = arr
  child_process.spawn(arg1, argMore, {
    stdio: 'inherit',
    ...option
  })
}
function requireUncached(filePath) { // 避免 require 使用缓存
  delete require.cache[require.resolve(filePath)]
  return require(filePath)
}
function uuid(sep = '') {
  let increment = process.increment === undefined ? (process.increment = 1) : (process.increment = (process.increment + 1))
  // let str = `${increment}_${process.pid}_${('' + (Math.random() + Math.random()))}`
  // console.log('increment', increment)
  // return str.replace('.', '').replace(/_/g, sep)
  return `${Date.now()}_${increment}`.replace(/_/g, sep)
}
function sleep(time = 1000) { return new Promise((res, rej) => setTimeout(res, time)) }
function clearRequireCache() { // 清除 require 缓存, 使用场景: 当 require 同一个 json 文件, 但这文件改变后再 require 时并没有改变
  Object.keys(require.cache).forEach(key => delete require.cache[key])
}
function absPath(file = '') { return require('path').resolve(__dirname, file) }
