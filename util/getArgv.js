// 用于解析参数并输出
const [arg1, ...argv] = process.argv.slice(2)
if(arg1 === 'getArgv_json') {process.stdout.write(JSON.stringify(argv, null, 2))}
if(arg1 === 'getArgv_line') {process.stdout.write(argv.join(' '))}
