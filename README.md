# qs - quick start
命令, 可执行文件管理工具, 支持 `Node.js v10+` .

``` sh
$ qs -n hi echo hello
hello

$ qs -s hi
hello

$ qs -s hi -- world
hello world
```

## 功能特点
- 保存控制台命令, 以供任意位置快速使用, 无需再进入原来的目录.
- 记录任务的运行次数, 时间.
- 删除或停止任务, 无需 kill/taskkill/ctrl+c.
- 全局使用你的脚本, 可执行文件, 第三方工具, 无需添加环境变量.
- 跨平台, 你可以在 linux/macos/windows 上以相同的方式使用.


## 安装
**如果你已经安装过 node.js 可以直接使用以下命令.**
``` sh
npm i -g wll8/qs#install
```

没有安装过 nodejs, 你可以使用以下命令自动安装. 由于直接运行[`网络脚本`](https://raw.githack.com/wll8/qs/install/install.bat), 可能会收到安全提示. 如果你不信任, 可以[`选择从官网手动安装`](https://nodejs.org/en/download/).

**windows 自动安装脚本:**
``` sh
powershell -C "(new-object System.Net.WebClient).DownloadFile('https://raw.githack.com/wll8/qs/install/install.bat', 'install.bat'); start-process install.bat"
```

**macos/linux 自动安装脚本**
``` sh
wget -qO- https://raw.githack.com/wll8/qs/install/install.sh | bash
```

## 选项
- `-v --vers` -- 显示版本号
- `-h --help` -- 显示帮助信息
- `-r --raw-cmd` -- 以原始命令运行, 避免存储任务时变量被解析
  - 例: `qs -a -r "ls ./*"` linux 上列出当前目录所有文件, 并保存命令到任务列表中
- `--regexp` -- 查找任务时使用正则匹配(默认)
- `--task [kv...]` -- 显示或查找、修改任务
- `--task-show-id` -- 添加任务时输出 taskId
- `-a --task-add` -- 添加到任务记录
  - 例: `qs -a echo 123` 保存 `echo 123` 这条记录(及运行目录), 以方便再次运行
- `-n --task-name <name>` -- 添加任务时创建任务名称, 包含 -a
- `-d --task-des <info>` -- 添加任务记录并创建任务描述, 包含 -a
- `-s --task-start <id|name>` -- 启动任务
- `-k --task-kill <id|name>` -- 停止任务
- `--task-remove <id|name>` -- 删除任务
- `--config [k[=v]]` -- 查看、修改配置
- `--config-reset` -- 重置配置
- `--exer-arg=<string>` -- 设置解释器启动参数
- `--which` -- 输出命令所在路径

## 详情
#### qs 与 pm2 npm npx shx alias 有什么区别?
  - pm2 专于 node 进程管理.
  - npm 用于管理 npmjs 相关的依赖, 没有任务存储.
  - npx 可以直接运行未安装的 npmjs 工具, 不能运行系统命令, 如 win 上 `npx dir`.
  - shx 仅用于提供一些 linux 命令, 不能运行系统命令, 如 win 上 `npx dir`.
  - alias 设置命令为别名, 不能自动保存运行目录.
