#!/usr/bin/env bash

type node 1>/dev/null 2>&1
if [ $? != 0 ]
then
  wget -qO- https://min.gitcdn.xyz/repo/nvm-sh/nvm/v0.35.2/install.sh | bash
  source ~/.bashrc 1>/dev/null 2>&1
  source ~/.zshrc 1>/dev/null 2>&1
  source ~/.profile 1>/dev/null 2>&1
  nvm install --lts
  node -v
fi
type qs 1>/dev/null 2>&1
if [ $? != 0 ]
then
  type cnpm 1>/dev/null 2>&1
  if [ $? != 0 ]
  then
    npm install cnpm -g --registry=https://r.npm.taobao.org
  fi
  cnpm i -g wll8/qs#master
fi

qs --help
echo && echo 安装完成
bash
