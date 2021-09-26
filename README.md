# qs - quick start
<p align="center">
  <a href="https://www.npmjs.com/package/qs-cli"><img src="https://img.shields.io/npm/v/qs-cli.svg?sanitize=true" alt="Version"></a>
  <a href="https://www.npmjs.com/package/qs-cli"><img src="https://img.shields.io/npm/l/qs-cli.svg?sanitize=true" alt="License"></a>
  <div align="center">
    <a rel="noreferrer" target="_blank" href="https://cdn.jsdelivr.net/gh/wll8/static/Video_20200331231620_qs_demo.mp4">
      <img alt="qs 演示 gif" width="500" height="282" src="https://cdn.jsdelivr.net/gh/wll8/static/Video_20200123214014_hi_qs.gif" />
      <div>演示视频请点击</div>
    </a>
  </div>
<p>

快速打开各种类型的文件, 运行任务.

支持 `Node.js v10+` .

``` sh
$ npm i -g qs-cli

$ qs -n hi echo hello
hello

$ qs -s hi
hello

$ qs -s hi -- world
hello world
```

## 功能特点
- 全局使用你的脚本, 可执行文件, 第三方工具, 支持传递参数, 无需添加环境变量.
- 保存控制台命令, 在任意位置快速使用, 无需再进入原来的目录.
- 记录任务的运行信息, 例如次数, 时间.
- 删除或停止任务, 无需 kill/taskkill/ctrl+c.
- 跨平台, 你可以在 linux/macos/windows 上以相同的方式使用.

更多功能请参考文档.

## 选项
- `-v, --vers, --version` -- 显示版本号
- `-h, --help` -- 显示帮助信息
- `-p, --parallel` -- 并行执行命令，包含 -r
- `-r, --raw-cmd` -- 以原始命令运行, 避免存储任务时变量被解析
  - 例: `qs -a -r "ls ./*"` linux 上列出当前目录所有文件, 并保存命令到任务列表中
- `--regexp` -- 查找任务时使用正则匹配(默认)
- `--task [kv...]` -- 显示或查找、修改任务
- `--task-show-id` -- 添加任务时输出 taskId
- `-a, --task-add` -- 添加到任务记录
  - 例: `qs -a echo 123` 保存 `echo 123` 这条记录(及运行目录), 以方便再次运行
- `-n, --task-name <name>` -- 添加任务时创建任务名称, 包含 -a
- `-d, --task-des <info>` -- 添加任务记录并创建任务描述, 包含 -a
- `-s, --task-start <id|name>` -- 启动任务
- `-k, --task-kill <id|name>` -- 停止任务
- `--task-remove <id|name>` -- 删除任务
- `--config [k[=v]]` -- 查看、修改配置
- `--config-reset` -- 重置配置
- `--exer-arg=<string>` -- 设置解释器启动参数
- `--which` -- 输出命令所在路径
- `-o, --open` -- 打开 qs 中的文件或目录

## 安装与体验
如果你安装过 nodejs 那么可以直接使用 `npm i -g qs-cli` 从 npmjs 注册表中安装.  
如果你没有安装过 nodejs , 那么可以使用下面的一键脚本进行安装. 这会为你自动安装 node 和 qs.  

### 从 node 安装
npm 的原始镜像地址在中国比较慢, 你可以使用 cnpm 或者切换镜像地址来缓解这个问题. 

``` sh
npm i -g qs-cli # 常规安装方式
yarn global add qs-cli  # 如果你更喜欢 yarn ?
npx qs-cli # 听说你不想安装, 只想体验一下?
```

小贴士:
1. `npm i -g wll8/qs#develop` 安装 develop 分支.
1. `npm i -g qs-cli` 表示安装 npmjs 注册表中的最 qs 新版本.

### windows 一键脚本
[点击下载然后运行](https://github.com/wll8/qs/blob/master/install.bat?raw=true).
### mac/linux 一键脚本

``` sh
wget -qO- https://github.com/wll8/qs/blob/master/install.sh?raw=true | bash
```

### 体验
以下操作演示了 qs 运行和保存系统命令.

``` sh
qs echo good # 使用 qs 运行系统命令 `echo good`
qs -n hi echo hello # 运行 `echo hello` 这条命令, 并且把它保存起来, 保存的名字叫 `hi` .
qs -s hi # 使用 hi 这个名字来重新执行 `echo hello` 这条命令
qs -s hi -- world # 执行命令时拼接 `world` 这个参数, 相当于 `echo hello world`. 可以简写为 `qs -s hi world`
qs --task # 查看存储的任务
qs --task-remove hi # 删除 hi 这个任务
```

小贴士:
1. 执行系统命令时, qs 可以正常使用 `管道` 以及 `I/O流` .
1. 当然, qs 并不仅仅用来执行系统命令.

## 扩展功能
扩展功能让你在任何位置运行自定义程序甚至是任意文件.  
你只需要把想运行的程序放置在 qs 扩展目录中即可, 不必添加环境变量.  
扩展目录位于 `~/.qs/ext/` , 你可以使用 `qs -o ext` 打开它.  

小贴士:
1. 当你运行过 qs, 才会在你的电脑上生成扩展目录

### js 与 package.json
若无特殊说明, 以下的文件创建操作都在 qs 扩展目录下.

#### 当前目录下的同名 js 文件
对于一些简单的程序, 我们使用一个单文件即可完成, 所以你直接创建一个 js 文件即可.

1. 创建一个 js 文件: `demo.js` , 
1. 内容为 `console.log('hi qs~')` , 当然其他内容也可以.
1. 运行命令 `qs demo` , 即可输出 `hi qs~` .
1. 恭喜, 你的第一个 `qs 插件` 已经完成了 ^_^ .

``` sh
$ echo "console.log('hi qs~')">~/.qs/ext/demo.js
$ qs demo
hi qs~
```

#### 兼容 package.json 的可执行文件声明方式
对于复杂的程序, 你希望像标准的 node 工具库一样创建他们, 这很好. qs 支持 npm 的 package 执行文件解析, 并且为了更方便, qs 的规则更宽松一些.

假设你的一个 t2 目录, 在这个目录中有 `package.json` 文件, 内容如下:

``` sh
$ tree t2
t2
├── m.js
├── fn1.js
├── fn2.js
└── packge.json

$ cat packge.json
{
  "main": "m.js",
  "bin": {
    "a": "fn1.js",
    "b": "fn2.js"
  }
}

$ qs a # 这时候会运行 fn1.js 这个文件
```

如果没有指定 bin , 那么 qs 会使用 main 字段, 则运行 `qs t2` 则执行 m.js .

qs 遵循的规则和顺序(优先级与先后顺序一致):
1. 同名目录中 package 中的 bin
1. 同名目录中 package 中的 main
1. 不同名目录中 package 中的 bin
1. 同名目录中 index.js

小贴士:
1. 不要被上面的规则吓到, 因为你不必在意, 因为你几乎不会导致它们冲突, 你说呢?

#### 直接使用第三方 npm 工具库
如果你不想编写简单的 js 脚本, 也不想编写完整的 js工具库, 因为 npm 注册表已经存在一个很棒的工具.   
你只需要在扩展目录中添加, 即可使用它们.  

下面演示了如何使用 json 工具库.  
``` sh
$ cd ~/.qs/ext/ # 进入扩展目录
$ npm init -y # 生成 packge.json 文件
$ cnpm i -S json # 安装 json 工具库
$ curl httpbin.org/get|qs json headers # 使用 json 工具库
```

### 脚本的参数接收
还记得一开始的 `qs -s hi -- world` 吗? 它就是向 hi 这个任务传送 `world` 这个参数.  

你可以创建一个脚本例如 `arg.js` 来体验它:  

``` sh
$ echo "console.log(process.argv.slice(2))">~/.qs/ext/arg.js
$ qs arg 1 2 3
[ '1', '2', '3' ]
```

### 设置解释器的启动参数
对于`解释器`, 请参考 `config.exer` .  
使用 qs 的 `--exer-arg` 参数即可为解释器传送启动参数, 例如:  

``` sh
$ echo "print(123)">~/.qs/ext/t4.py # 创建一个 py 文件
$ qs --exer-arg=-v t4 # 向 python 传送 -v 参数, 相当于 `python -v ~/.qs/ext/t4.py`
```

小贴士:
1. 对于安装在 ext 中的程序, 可以直接进行调试, 例 `qs --exer-arg=--inspect-brk hs` 则启动 node 工具库 http-server 的调试状态. qs 会查询实际运行的脚本入口, 并把它交给解释器 node 运行.
1. 你可以使用 `--which` 查询包含 ext 外的程序脚本入口, 例 `qs --which pm2` .

### 按照 config.exer 配置的方式运行脚本
如果你不希望使用默认的解释器, 你可以修改它们. 这是一个常用的操作, 例如你需要使用另一个版本的解释器.  
那么你可以在 `config.exer` 中进行配置.  

例如: 
``` js
[
  {
    ext: ['.py', '.pyc'], // 文件类型(后缀), 可以有多个
    exer: 'python', // 解释器, 可以是全局命令, 或者解释器的绝对路径
  }
]
```

小贴士:
1. 对于没有配置在 exer 中的文件类型, qs 会直接使用命令打开它.
1. 在 windows 上, bat 脚本使用 cmd. mac/linux 使用 sh.
1. 可以使用它实现某类文件的默认打开方式.

## FQA
### qs 与 pm2 npm npx shx alias querystring 有什么区别?
- pm2 专于 node 进程管理.
- npm 用于管理 npmjs 相关的依赖, 没有任务存储.
- npx 可以直接运行未安装的 npmjs 工具, 不能运行系统命令, 如 win 上 `npx dir`.
- shx 仅用于提供一些 linux 命令, 不能运行系统命令, 如 win 上 `npx dir`.
- alias 设置命令为别名, 不能自动保存运行目录.
- qs 不是 querystring, 而是  quickstart.
