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
      qsPath,
    },
    binArg1,
    argParse: {
      taskStart,
    },
  } = global.qs

  await require(qsPath('./option.js'))()
  if(binArg1 && !taskStart) {
    await runCmd({binArg1})
  }

})

async function runCmd({
  binArg1,
}) {
  const {
    binArgMore,
    util: {
      cfg,
      getType,
      run,
      isWin,
      qsExtendDir,
      nodeBin,
      hasFile,
      qsPath,
      nodeBinNoMainPackage,
      obj2str,
      getExer,
      path,
    },
    argParse,
    argParse: {
      exerArg,
      taskAdd,
    },
  } = global.qs
  const defaultArg = [{cwd: process.cwd()}]
  let {bin} = findBin()

  function findBin() { // 查找 ext 目录中的可执行路径, 结果可能是脚本或二进制
    { // 查找不存在于 package.json 中的程序, 主要是 js 或 package.json 的 bin 字段指定的文件
      let bin = nodeBinNoMainPackage(binArg1)
      if(bin) {
        return {
          type: 'file',
          bin,
        }
      }
    }
    { // 以 ext/package.json 查找 package.dependencies 中的程序
      const package = qsPath(`${qsExtendDir}/package.json`)
      const hasDependencies = hasFile(package) && require(package).dependencies
      const hasNodeModules = hasFile(`${qsExtendDir}/node_modules`)
      if(hasDependencies && hasNodeModules) {
        let bin = nodeBin(binArg1)
        if(bin) {
          return {
            type: 'node_modules',
            bin,
          }
        }
      }
      if(hasDependencies && (hasNodeModules === false)) {
        print('package.dependencies 中的程序似乎没有安装')
      }
    }
    { // 查找 ext 目录下的脚本文件
      let configExtList = cfg.get('exer').map(item => item.ext)
      while (configExtList.some(Array.isArray)) {
        configExtList = [].concat(...configExtList)
      }
      const extList = (process.env.PATHEXT || '').toLocaleLowerCase().split(';').concat(configExtList)
      for (let index = 0; index < extList.length; index++) {
        const ext = extList[index]
        const bin = qsPath(`${qsExtendDir}/${binArg1}${ext}`)
        if(hasFile(bin)) {
          return {
            type: 'ext',
            bin,
          }
        }
      }
    }
    { // 如果没有找到 js 可以处理的程序, 则返回空对象
      return {}
    }
  }

  if(bin) { // 运行 ext 目录中的程序, 脚本与解释器请参考 config.exer
    let exer = getExer(bin) || ''
    let exerArgArr = []
    let runMainEd = false // 是否经过 runMain 方法
    if(
      (Boolean(exer) === false) // 如果解释器 exer 不存在, 则把 bin 作为解释器运行, 移除 bin
      || (exer.toLowerCase() === bin.toLowerCase()) // 如果解释器与命令是同一文件时, 则保留 exer, 移除 bin
    ) {
      exer = bin
      bin = ''
    }
    if(exerArg) {
      // 转换字符串参数为数组, 供 spawnWrap 使用
      exerArgArr = (Array.isArray(exerArg) ? exerArg : [exerArg]).reduce((acc, arg) => {
        return acc.concat(arg.split(/\s+/))
      }, [])
      exer = [exer, ...exerArgArr, bin]
    }
    if(Boolean(exerArg) === false && /^node(|\.exe)$/i.test(path.basename(exer))) { // 无需启动 node 执行 js 程序
      const Module = require('module')
      if (obj2str(argParse) === '{}') {
        require('yargs').reset()
      }
      process.argv = [
        process.argv[0],
        bin // node 脚本路径。 `runMain()`会将其设置为新的 main
      ].concat(binArgMore) // 脚本的其他选项
      { // 还原 log 重写 并运行 runMain
        console.log = console._log ? console._log : console.log
        Module.runMain()
      }
      runMainEd = true
    }
    const spawnWrapArgv = [
      ...(getType(exer, 'array') ? exer : [exer, bin]),
      ...binArgMore,
    ].filter(item => item !== '')
    runMainEd === false && await run.spawnWrap(
      spawnWrapArgv,
      defaultArg,
      taskAdd,
    )
  } else { // 移交命令和参数给系统, 让系统去执行, 例 `qs echo 123`
    process.env.PATH = `${qsExtendDir}${path.delimiter}${process.env.PATH}`
    await run.spawnWrap([binArg1, ...binArgMore], defaultArg, taskAdd)
    return process.exit()
  }

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
