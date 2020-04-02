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
      runCmd,
      findBin,
      shelljs,
      print,
      qsPath,
    },
    binArg1,
    argParse: {
      taskStart,
      which,
    },
  } = global.qs

  await require(qsPath('./option.js'))()
  let {bin} = findBin(which || binArg1)
  if(which) {
    print(bin || String(shelljs.which(which) || ''))
    process.exit()
  }
  if(binArg1 && !taskStart) {
    await runCmd({bin, binArg1})
  }

})

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
