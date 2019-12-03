#!/usr/bin/env node

if(module.parent) { // 如果是其他程序调用, 则导出方法给其他程序
  const extendArgv = process.argv
  const qsExports = new Promise(async (res, rej) => {
    async function listener({argv, pid}) {
      process.argv = argv
      let globalInitRes = await globalInit({argv, pid})
      process.argv = extendArgv
      process.removeListener('message', listener) // 收到数据后, 取消监听
      res(globalInitRes)
    }
    process.on('message', listener);

  })
  module.exports = qsExports
  return
}

new Promise(async () => {
  global.qs = await globalInit()
  const {
    util: {
      getExer,
      qsOutsideDir,
      isWin,
      print,
      run,
      hasFile,
      nodeBin,
      nodeBinNoMainPackage,
      cfg,
      dateFormater,
      qsPath,
    },
    binArg1,
    binArgMore,
    rawArg1,
    rawArgMore,
    argParse,
    task,
    pid,
    argParse: {
      taskAdd,
      taskStart,
    },
  } = global.qs

  await require(qsPath('./option.js'))()
  if(binArg1 && !taskStart) {
    const defaultArg = [{cwd: process.cwd()}]
    const bin = nodeBinNoMainPackage(binArg1)
    if(bin) { // 扩展功能, 运行 extend 目录中的程序
      await autoInstallPackage(bin)
      const exer = getExer(bin)
      await run.spawnWrap([...exer, ...binArgMore], [
        {
          ...defaultArg[0],
          stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        },
        {
          send: {
            argv: process.argv,
            pid: pid,
          },
        }
      ], taskAdd)
    } else { // 第三方功能, 运行 outside 目录中的程序, 顺序: file > package.json > system
      // 添加环境变量, 让系统可以找到 outside 目录中的程序, win 下的分隔符是 ; 类 unix 是 : .
      process.env.PATH = `${qsOutsideDir}${isWin ? ';' : ':'}${process.env.PATH}`

      { // 运行文件程序
        if(isWin === false) {
          // 不是 windows 时才需要处理文件全路径匹配
          // -- win 上有 PATHEXT 系统变量可以直接运行相关后缀的脚本, 比如 a.bat 的 .bat 后缀在列表中, 就可以直接使用 `a` 运行.
          // -- linux 上 a.sh 必须匹配全路径, 即使添加程序所在目录到环境变量中, 也只能使用 `a.sh` 运行.
          const binFile = qsPath(`${qsOutsideDir}/${binArg1}.sh`)
          if(hasFile(binFile)) {
            await run.spawnWrap(['sh', [binFile, ...binArgMore]], defaultArg, taskAdd)
            process.exit()
          }
        }
      }

      { // 运行 package.dependencies 中的程序
        const package = qsPath(`${qsOutsideDir}/package.json`)
        const hasDependencies = hasFile(package) && require(package).dependencies
        const hasNodeModules = hasFile(`${qsOutsideDir}/node_modules`)
        if(hasDependencies && hasNodeModules) {
          const nodeBinFile = nodeBin(binArg1)
          if(nodeBinFile) {
            await runNodeBin({nodeBinFile, binArgMore, arg: defaultArg})
            process.exit()
          }
        }
        if(hasDependencies && (hasNodeModules === false)) {
          print('你存在 package.dependencies 但是没有进行安装, 尝试 `qs --install outside package.dependencies`')
        }
      }

      { // 移交命令和参数给系统, 让系统去执行, 例 `qs echo 123`
        await run.spawnWrap([binArg1, ...binArgMore], defaultArg, taskAdd)
        process.exit()
      }
    }
  }

})

async function autoInstallPackage (bin) {
  // 如果扩展目录存在 package.json 且存在 dependencies 但没有 node_modules 时, 自动安装依赖
  const {
    util: {
      qsExtendDir,
      run,
      hasFile,
      cfg,
      qsPath,
    },
  } = global.qs
  let re =  new RegExp(`${qsExtendDir}/(.*?)/`)
  let dirName = (bin.match(re) || [])[1]
  if(dirName) {
    let package = qsExtendDir + '/' + dirName + '/package.json'
    let node_modules = qsExtendDir + '/' + dirName + '/node_modules'

    if(hasFile(package) && require(package).dependencies && !hasFile(node_modules)) { // 自动安装依赖
      let cmd = `${cfg.get('moduleManage')} i --production`
      await run.spawnWrap(cmd, [{cwd: qsPath(qsExtendDir + '/' + dirName)}])
    }
  }
}

async function runNodeBin ({nodeBinFile, binArgMore, arg = []}) {
  const {
    util: {
      getExer,
      print,
      run,
    },
    argParse: {
      taskAdd,
    },
  } = global.qs
  const exer = getExer(nodeBinFile)

  // 不优雅的判断管道判断
  const chunk = await new Promise((resolve, reject) => {
    process.stdin.on('data', chunk => {
      resolve(String(chunk))
    })
    setTimeout(() => resolve(undefined), 10)
  })
  if(chunk) { // 管道内容
    const argStr = binArgMore.map(item => `'${item}'`).join(' ')
    const cmd = `echo '${chunk.replace(/\n/g, "")}' | ${exer.join(' ')} ${argStr}`
    const {error, stdout, stderr} = await run.execAsync(cmd, arg, taskAdd)
    print(stdout)
  } else {
    await run.execFileSync([...exer, ...binArgMore], arg, taskAdd)
    process.exit()
  }
}

async function globalInit(init) { // 把一些经常用到的方法保存到全局, 避免多次初始化影响性能, 不使用到的尽量不初始化
  const {pid = process.pid, argv = process.argv} = init || {}
  const {
    initArg,
    initUtil,
    initTask,
    initCfg,
  } = require(`${__dirname}/util/init.js`)
  let util = await initUtil()
  const {
    cfg,
    qsPath,
    execAsync,
  } = util
  let {
    argParse,
    binArg1,
    rawArg1,
    binArgMore,
    rawArgMore,
  } = await initArg({util, argv})
  let task = await initTask({util, argParse, pid, binArg1})
  const qs = (() =>  {// 设置对象的 key 为只读
    let qs = {
      binArg1,
      rawArg1,
      argParse,
      binArgMore,
      rawArgMore,
      util,
      task,
      pid,
    }
    // Object.keys(qs).forEach(key => qs[key] = {value: qs[key]})
    // return Object.create({}, qs)
    return qs
  })();

  await initCfg({qsPath, cfg, execAsync})
  return qs
}
