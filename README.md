# qs - quick start
A node command line tool to quickly start `debug code fragments` or `create common project structurs`.

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
