#!/usr/bin/env bash

which node 1>/dev/null 2>&1
if [ $? != 0 ]
then
  wget -qO- https://raw.githack.com/nvm-sh/nvm/v0.35.2/install.sh | bash
  source ~/.bashrc 1>/dev/null 2>&1
  source ~/.zshrc 1>/dev/null 2>&1
  source ~/.profile 1>/dev/null 2>&1
  nvm install --lts
  node -v
fi
which qs 1>/dev/null 2>&1
if [ $? != 0 ]
then
  npm install cnpm -g --registry=https://r.npm.taobao.org
  cnpm i -g wll8/qs#develop
fi

set -x
qs --help
qs -n hi echo hello
qs -s hi
qs -s hi -- world
set +x

bash
