# qs - quick start
命令, 可执行文件管理工具.

``` sh
$ qs -n hi echo hello
hello
$ qs -s hi
hello
```

## 功能特点
- 保存控制台命令, 以供任意位置快速使用, 无需再进入原来的目录.
- 记录任务的运行次数, 时间.
- 删除或停止任务, 无需 kill/taskkill/ctrl+c.
- 全局使用你的脚本, 可执行文件, 第三方工具, 无需添加环境变量.
- 跨平台, 你可以在 linux/macos/windows 上以相同的方式使用.

## 选项
- `qs -v --vers` -- 显示版本号
- `qs -h --help` -- 显示帮助信息
- `qs -r --raw-cmd` -- 以原始命令运行, 避免存储任务时变量被解析
  - 例: `qs -a -r "ls ./*"` linux 上列出当前目录所有文件, 并保存命令到任务列表中
- `qs --explicit` -- 查找任务时使用精确匹配
- `qs --regexp` -- 查找任务时使用正则匹配(默认)
- `qs --task [kv...]` -- 显示或查找、修改任务
- `qs --task-show-id` -- 添加任务时输出 taskId
- `qs -a --task-add` -- 添加到任务记录
  - 例: `qs -a echo 123` 保存 `echo 123` 这条记录(及运行目录), 以方便再次运行
- `qs -n --task-name <name>` -- 添加任务时创建任务名称, 包含 -a
- `qs -d --task-des <info>` -- 添加任务记录并创建任务描述, 包含 -a
- `qs -s --task-start <id|name>` -- 启动任务
- `qs -k --task-kill <id|name>` -- 停止任务
- `qs --task-remove <id|name>` -- 删除任务
- `qs --config [k[=v]]` -- 查看、修改配置
- `qs --config-reset` -- 重置配置

## 详情
#### qs 与 pm2 npm npx shx alias 有什么区别?
  - pm2 专于 node 进程管理.
  - npm 用于管理 npmjs 相关的依赖, 没有任务存储.
  - npx 可以直接运行未安装的 npmjs 工具, 不能运行系统命令, 如 win 上 `npx dir`.
  - shx 仅用于提供一些 linux 命令, 不能运行系统命令, 如 win 上 `npx dir`.
  - alias 设置命令为别名, 不能自动保存运行目录.
