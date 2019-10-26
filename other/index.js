const {
  util: {
    nodeBin,
    print,
    run,
  },
  argParse: {
    taskAdd,
  },
} = global.qs

module.exports = async ({arg1, argMore, arg = []}) => {
  const nodeBinFile = nodeBin(arg1)
  const argMoreStr = argMore.join(' ')
  if(nodeBinFile) { // run nodejs command
    const cmd = `node ${nodeBinFile} ${argMoreStr}`
    // 不优雅的判断管道判断
    const chunk = await new Promise((resolve, reject) => {
      process.stdin.on('data', chunk => {
        resolve(String(chunk))
      })
      setTimeout(() => resolve(undefined), 10)
    })
    if(chunk) { // 管道内容
      const argStr = argMore.map(item => `'${item}'`).join(' ')
      const cmd = `echo '${chunk.replace(/\n/g, "")}' | node ${nodeBinFile} ${argStr}`
      const {error, stdout, stderr} = await run.execAsync(cmd, arg, taskAdd)
      print(stdout)
    } else {
      await run.execFileSync(cmd, arg, taskAdd)
      process.exit()
    }
  } else { // run system command
    const cmd = `${arg1} ${argMoreStr}`
    await run.spawnWrap(cmd, arg, taskAdd)
  }
}
