const {
  execFileSync,
  nodeBin,
  execAsync,
} = require('./../util.js')
module.exports = async ({arg1, argMore}) => {
  const cmd = `node ${nodeBin(arg1)} ${argMore.join(' ')}`
  // 不优雅的判断管道判断
  const chunk = await new Promise((resolve, reject) => {
    process.stdin.on('data', chunk => {
      resolve(String(chunk))
    })
    setTimeout(() => resolve(undefined), 10)
  })
  if(chunk) {
    const argStr = argMore.map(item => `'${item}'`).join(' ')
    const cmd = `echo '${chunk.replace(/\n/g, "")}' | node ${nodeBin(arg1)} ${argStr}`
    const {error, stdout, stderr} = await execAsync(cmd)
    console.log(stdout)
  } else {
    await execFileSync(cmd)
    process.exit()
  }
}
