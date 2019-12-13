#!/usr/bin/env node

new Promise(async () => {
  if(global.qs === undefined) {
    global.qs = await globalInit()
  } else {
    console.error(`global.qs 变量被占用, 请尝试更新 qs: \r\nnpm i -g qs`)
    process.exit()
  }
  const {
    util: {
      obj2str,
      getType,
      path,
      shelljs,
      getExer,
      qsExtendDir,
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
      nodeArg,
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
      await runJs({ bin, })
    } else { // 第三方功能, 运行 outside 目录中的程序, 顺序: file > package.json > system
      // 添加环境变量, 让系统可以找到 outside 目录中的程序, win 下的分隔符是 ; 类 unix 是 : .
      process.env.PATH = `${qsExtendDir}${isWin ? ';' : ':'}${process.env.PATH}`

      { // 运行文件程序
        if(isWin === false) {
          // 不是 windows 时才需要处理文件全路径匹配
          // -- win 上有 PATHEXT 系统变量可以直接运行相关后缀的脚本, 比如 a.bat 的 .bat 后缀在列表中, 就可以直接使用 `a` 运行.
          // -- linux 上 a.sh 必须匹配全路径, 即使添加程序所在目录到环境变量中, 也只能使用 `a.sh` 运行.
          const binFile = qsPath(`${qsExtendDir}/${binArg1}.sh`)
          if(hasFile(binFile)) {
            await run.spawnWrap(['sh', [binFile, ...binArgMore]], defaultArg, taskAdd)
            process.exit()
          }
        }
      }

      { // 运行 package.dependencies 中的程序
        const package = qsPath(`${qsExtendDir}/package.json`)
        const hasDependencies = hasFile(package) && require(package).dependencies
        const hasNodeModules = hasFile(`${qsExtendDir}/node_modules`)
        if(hasDependencies && hasNodeModules) {
          const bin = nodeBin(binArg1)
          if(bin) {
            await runJs({ bin, })
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

async function runJs({
  bin,
}) {
  const {
    binArgMore,
    util: {
      obj2str,
      getExer,
      path,
    },
    argParse,
    argParse: {
      nodeArg,
      taskAdd,
    },
  } = global.qs
  const defaultArg = [{cwd: process.cwd()}]
  let exer = getExer(bin) || ''
  let nodeArgArr = []
  if (nodeArg) {
    // 转换字符串参数为数组, 供 spawnWrap 使用
    nodeArgArr = (Array.isArray(nodeArg) ? nodeArg : [nodeArg]).reduce((acc, arg) => {
      return acc.concat(arg.split(/\s+/))
    }, [])
  }
  if(/^node(\.|)/i.test(path.basename(exer))) {
    if(nodeArg === undefined) { // 无需启动 node
      const Module = require('module')
      if (obj2str(argParse) === '{}') {
        require('yargs').reset()
      }
      process.argv = [
        process.argv[0],
        bin // node 脚本路径。 `runMain()`会将其设置为新的 main
      ].concat(binArgMore) // 脚本的其他选项
      { // 还原 log 重写 并运行 runMain
        console.log = console._log
        Module.runMain()
      }
      return process.exit()
    } else {
      exer = [exer, ...nodeArgArr, bin]
    }
  }
  await run.spawnWrap( // 需要启动 node
    [
      ...(getType(exer, 'array') ? exer : [exer]),
      ...binArgMore,
    ],
    defaultArg,
    taskAdd,
  )
}

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
    execWrap,
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

  await initCfg({qsPath, cfg, execWrap})
  return qs
}
