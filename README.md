# qs - quick start
快速开始行动, 不必担心环境.

- 立刻创建所需目录结构, 自动安装相关依赖, 并且启动项目甚至打开编辑器.
- 跨平台使用常用工具, 例: ssh, scp.
- 任务存储及管理.

## 选项

- [x] `qs -v --vers` -- 显示版本号
- [x] `qs -h --help` -- 显示帮助信息
- [ ] `qs --explicit` -- 查找内容时使用精确匹配
- [ ] `qs --case` -- 查找内容时使用大小写敏感匹配
- [ ] `qs --task [kv...]` -- 显示或查找、修改任务
- [x] `qs -a --task-add` -- 添加到任务记录
  - 例: `qs -a echo 123` 保存 `echo 123` 这条记录, 以方便再次运行
- [ ] `qs -n --task-name <name>` -- 添加任务时创建任务名称
- [ ] `qs -s --task-start <id|name>` -- 启动任务
- [ ] `qs -k --task-kill <id|name>` -- 停止任务
- [ ] `qs --task-remove <id|name>` -- 删除任务
- [ ] `qs --config [kv...]` -- 显示或查找、修改配置
- [ ] `qs --config-reset` -- 重置配置
- [ ] `qs --node-modules-remove` -- 删除 qs 中的 node_modules
- [ ] `qs --init` -- 初始化 qs, 不包含命令
- [ ] `qs --init-extend` -- 初始化默认的扩展命令, 使用了 qs 内部方法的工具, 如 tp, ss
- [ ] `qs --init-outside` -- 初始化默认的外部命令, 可以独立运行的第三方程序, 如 ssh, scp, shx
- [ ] `qs --add <执行器|系统> <name1, name2...>` -- 添加一个功能, 默认为 node 执行器或当前系统, 执行器存在时忽略系统
  -  例: `qs --add python httpie` 则表示 `pip install httpie` 到 qs 的 python 执行器下, 执行器可在配置中添加.
  -  例: `qs --add win32 ssh` 则表示 下载适用于 win32 的 ssh 工具.

提示: 
  - kv: `k` 是显示 `v` 的值, `k=v` 是修改, `k==v` 是查找, `name==xw age=23` 是把 name 为 xw 的数据的 age 修改为 23.
