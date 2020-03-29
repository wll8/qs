// 用于解析参数并输出
const [arg1, ...argMore] = process.argv.slice(2)
if(arg1 === 'getArgv_json') {process.stdout.write(`${JSON.stringify(argMore, null, 2)}\n`)}
if(arg1 === 'getArgv_line') {process.stdout.write(`${argMore.join(' ')}\n`)}
