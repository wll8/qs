# qs - quick start
快速开始调试或者工作。

- 立刻创建所需目录结构, 自动安装相关依赖, 并且启动项目。
- 跨平台使用常用 linux 工具。
- 任务存储及管理。

```
bash-3.2$ qs
Usage: qs <command> [options]

Options:
  -v, --vers       output the version number
  -h, --help       output usage information

Commands:
  tp [options]     Select a template to create a project
  html
  admin [options]  admin
  init [options]   Initializer
  *                More features

  Run qs <command> --help for detailed usage of given command.
``` 

```
bash-3.2$ qs tp
Usage: tp [options]

Select a template to create a project

Options:
  -n, --name <taskName>                     Task Name, No repetition allowed
  -t, --template <templateName>             Template type
  --openDir                                 Open the directory
  -d, --directory <directoryName>           Specify folders (default: "{dataDir}/{template}__{dateFormater}/")
  -f, --fileName [fileName]                 Specify a filename, Select template automatically according to suffix (default: "index.js")
  -m, --module <moduleName,moduleName2...>  Add and automatically install dependencies, separating multiple with commas
  --es5 [config]                            Save and convert to Es5 file
  --local                                   保存 cdn 到本地
  -h, --help                                output usage information
```

```
bash-3.2$ qs admin
Usage: admin [options]

admin

Options:
  -c --config <key[=val]>  View or change configuration
  --resetConfig            Reset to default configuration
  --deleteNodeModouse      Delete all node_modules
  -t --task [cmd[=arg]]    管理通过 qs 创建的任务列表
  -h, --help               output usage information
```

``` sh
# 以下通过示例解释部分命令功能

qs tp -t js # 使用 js 模版运行创建项目，并自动启动
qs tp -t js --openDir # 使用 js 模版运行创建项目，使用默认编辑器打开项目目录，并自动启动,
qs tp -t js -d . # 在当前目录创建项目
qs tp -t js -f abc.js # 设置入口文件名为 abc.js
qs tp -t js -m lodash axios # 添加并自动安装依赖到项目目录
qs init # 初始化 qs 核心功能
qs init -e # 初始化 qs 扩展功能(使用 qs api 编写于 qs 目录, 如 qs ss)
qs init -o # 初始化 qs 其他功能(安装到 qs 目录的第三方工具, 如 qs ssh)
qs admin -c '' # 查看当前所有 qs 配置
qs admin -c openExe # 查看当前 qs 所配置的默认编辑器
qs admin -c openExe=code # 修改 qs 默认的编辑器为 vscode, 你可以配置为绝对路径, 或环境命令
qs admin --resetConfig  # 重置 qs 的所有配置
qs admin --deleteNodeModouse # 删除 qs 的所有相关的 node_modules, 你可以使用 qs init 重新获取
qs admin -t # 查看所有任务列表
qs admin -t stop=64 # 停止 ID 为 64 的任务
qs admin -t start=64 # 启动 ID 为 64 的任务
```
