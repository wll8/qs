const decodeImage = require('jimp').read;
const qrcodeReader = require('qrcode-reader');
const qrcodeTerminal = require('qrcode-terminal');
const path = url => require('path').join(__dirname, url)
const log = console.log

new Promise(async () => {
  const html = await get_res('https://show.freess.info/')
  const ssList = ((await getHtmlSrInfo(html)) || []).filter(item => item.password && item.port)
  // console.log('ssList', ssList)
  ssList.forEach(item => {
    delete item.img
    console.log(item)
    qrcodeTerminal.generate(item.url, {small: true})
  })
})


function get_res (url, is_down = false) {
  // 根据 url 获取 res, is_down: 是否下载
  return new Promise((resolve, reject) => {
    require(url.replace(/^(.*):\/\/.*/, '$1')).get(url, res => {
      const { statusCode } = res;
      let contentLength = parseInt(res.headers['content-length']);
      if(statusCode !== 200) {
        reject(statusCode)
      }
      let data = '';
      if(is_down) {
        res.setEncoding('binary');
      } else {
        res.setEncoding('utf8');
      }
      res.on('data', function (chunk) {
        data += chunk;
        if(is_down) {
          let length = ((data.length) / contentLength) * 100;
          let percent = parseInt(((length).toFixed(0)));
          // 终端进度条
          process.stdout.write(`${url.split('/').slice(-1)[0]} 已下载/总共 = ${data.length}/${contentLength} = ${percent}/100\r`);
        }
      });
      res.on('end', function () {
        if(!is_down) {
          data.toString('utf8')
        }
        resolve(data)
      });
    }).setTimeout(3000, () => {
      log('超时')
      reject('')
    })
  })
}

function getHtmlSrInfo (html) {
  let str = html
  let imgReg = /<a.*?(?:>|\/>)/gi; // 获取开始标签
  let srcReg = /href=[\'\"]?(data[^\'\"]*)[\'\"]?/i;
  let arr = str.match(imgReg);
  let base64list = []
  for (let index = 0; index < arr.length; index++) {
   let src = arr[index].match(srcReg);
   //获取图片地址
   if(src && src[1]){
     base64list.push(src[1]) // 得到属性
   }
  }

  return Promise.all(base64list.map(img => {
    return new Promise((resolve, reject) => {
      srBase64pngDecode(img, url => {
        resolve({...srDecode(url), img})
      })
    })
  }))
}

// 从 base64 二维码图片中读取信息
function srBase64pngDecode(srBase64png, cb) {
  var base64 = srBase64png
  base64Data = base64.replace('data:image/png;base64,', '')
  var buf = Buffer.from(base64Data, 'base64')
  decodeImage(buf, function (err, image) {
    if (!err) {
      let decodeQR = new qrcodeReader();
      decodeQR.callback = function (errorWhenDecodeQR, result) {
        if (result) {
          console.log('二维码内容', result.result);  // 结果
          cb(result.result)
        } else {
          console.log('解码二维码错误')
          cb('')
        }
      };
      decodeQR.decode(image.bitmap);
    } else {
      console.log('渲染图片错误')
    }
  });
}

// 解码ssr
function ssrDecode(url) {
  let data = Buffer.from(url.replace('ssr://', ''), 'base64').toString('utf8')
  let arr = data.split(':');
  value = {
    url,
    ip: arr[0],
    port: arr[1].trim(),
    password: Buffer.from(arr[5].split('/?')[0], 'base64').toString('utf8'),
    obfs: arr[4],
    method: arr[3],
    protocol: arr[2],
  }
  return value
}

// 解码ss
function ssDecode(url) {
  let data = Buffer.from(url.replace('ss://', ''), 'base64').toString('utf8')
  let arr = data.split(':');
  value = {
    url,
    ip: arr[1].split('@')[1],
    port: arr[2].trim(),
    password: arr[1].split('@')[0],
    method:  arr[0],
  }
  return value
}

// 解码 ss 或 ssr
function srDecode(url) {
  if (url.startsWith('ssr://')) {
    return ssrDecode(url)
  } else if (url.startsWith('ss://')) {
    return ssDecode(url)
  } else if (url === '') {
    console.log('地址为空')
  } else {
    console.log('地址错误')
  }
}
