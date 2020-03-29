@echo off && chcp 936 && cls
title 安装 nodejs
REM mode con cols=120 lines=30
cd /d %homepath%
set nodeV=v10.16.3
set nodeName=node-%nodeV%-win-x86
set nodePath=%cd%\%nodeName%
set nodeExe="%nodePath%\node.exe"
where node>nul 2>nul
if %errorlevel%==0 (
  goto :yesNode
) else (
  if exist "%nodeName%.zip" (cd .) else (
    echo 正在下载 nodejs...
    powershell -C "(new-object System.Net.WebClient).DownloadFile('https://npm.taobao.org/mirrors/node/%nodeV%/%nodeName%.zip', '%nodeName%.zip')"
  )
  if exist "%nodePath%" (cd .) else  (
    echo 正在安装 nodejs, 文件复制过程中请勿取消...
    call :unZipFile "%cd%\" "%nodePath%.zip"
    setx path "%nodePath%\;%path%"
  )
  if exist %nodeExe% goto :installQs
)
pause
exit /b

:yesNode
  cmd /c "qs -v>nul 2>nul"
  for /f "delims=" %%a in ('where node') do set "nodePath=%%~dpa"
  if %errorlevel%==0 (
    qs --help
    echo. && echo 安装完成
    del %0 && cmd /k
  ) else (
    goto :installQs
  )
exit /b

:testQs
  cd /d "%nodePath%"
  @echo on
  cmd /c "qs --help"
  @echo off
  echo. && echo 安装完成
  del %0 && cmd /k "cd /d """%nodePath%""""
exit /b

:installQs
  echo 正在安装 qs...
  if exist "%nodePath%\cnpm.cmd" (cd .) else cmd /c "cd /d """%nodePath%""" && npm.cmd i -g cnpm --registry=https://registry.npm.taobao.org"
  if exist "%nodePath%\qs.cmd" (cd .) else cmd /c "cd /d """%nodePath%""" && cnpm.cmd i -g wll8/qs#master"
  goto :testQs
exit /b

:unZipFile <ExtractTo> <newzipfile>
  set vbs="%temp%\_.vbs"
  if exist %vbs% del /f /q %vbs%
  >%vbs%  echo Set fso = CreateObject("Scripting.FileSystemObject")
  >>%vbs% echo If NOT fso.FolderExists(%1) Then
  >>%vbs% echo fso.CreateFolder(%1)
  >>%vbs% echo End If
  >>%vbs% echo set objShell = CreateObject("Shell.Application")
  >>%vbs% echo set FilesInZip=objShell.NameSpace(%2).items
  >>%vbs% echo objShell.NameSpace(%1).CopyHere(FilesInZip)
  >>%vbs% echo Set fso = Nothing
  >>%vbs% echo Set objShell = Nothing
  cscript //nologo %vbs%
  if exist %vbs% del /f /q %vbs%
exit /b
