const QS_PATH = global.QS.QS_PATH
const {
  nodeBin,
} = require(QS_PATH('./util/index.js'))

const {RUN} = global.QS

module.exports = async ({arg1, argMore}) => {
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
      const {error, stdout, stderr} = await RUN.execAsync(cmd)
      process.stdout.write(stdout)
    } else {
      await RUN.execFileSync(cmd, [], true)
      process.exit()
    }
  } else { // run system command
    const cmd = `${arg1} ${argMoreStr}`
    await RUN.spawnWrap(cmd, [], true)
  }
}
