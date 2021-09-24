@echo off && chcp 936 && cls
rem mode con cols=120 lines=30
set installPath=%homepath%
cd /d %installPath%
set packName=qs-cli
title Automatically install %packName%
set packCli=qs
set packArg="-h"
set nodeV=v10.16.3
set nodeName=node-%nodeV%-win-x86
set nodePath=%cd%\%nodeName%
set nodeExe="%nodePath%\node.exe"
where node>nul 2>nul
if %errorlevel%==0 (
  goto :yesNode
) else (
  if exist "%nodeName%.zip" (cd .) else (
    echo Downloading nodejs, please be patient...
    powershell -C "(new-object System.Net.WebClient).DownloadFile('https://npm.taobao.org/mirrors/node/%nodeV%/%nodeName%.zip', '%nodeName%.zip')"
  )
  if exist "%nodePath%" (cd .) else  (
    echo Installing nodejs, please be patient...
    call :unZipFile "%cd%\" "%nodePath%.zip"
    setx path "%nodePath%\;%path%"
  )
  if exist %nodeExe% goto :install
)
pause
exit /b

:yesNode
  cmd /c "%packCli% %packArg%>nul 2>nul"
  for /f "delims=" %%a in ('where node') do set "nodePath=%%~dpa"
  if %errorlevel%==0 (
    goto :test
  ) else (
    goto :install
  )
exit /b

:test
  cd /d "%nodePath%"
  @echo on
  cmd /c "%packCli% %packArg%"
  @echo off
  echo. && echo %packName% installation complete
  del %0 && cmd /k "cd /d """%nodePath%""""
exit /b

:install
  echo Installing %packName%...
  if exist "%nodePath%\cnpm.cmd" (cd .) else cmd /c "cd /d """%nodePath%""" && npm.cmd i -g cnpm --registry=https://registry.npm.taobao.org"
  if exist "%nodePath%\%packCli%.cmd" (cd .) else cmd /c "cd /d """%nodePath%""" && cnpm.cmd i -g %packName%"
  goto :test
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
  >>%vbs% echo objShell.NameSpace(%1).CopyHere FilesInZip, 4
  >>%vbs% echo Set fso = Nothing
  >>%vbs% echo Set objShell = Nothing
  cscript //nologo %vbs%
  if exist %vbs% del /f /q %vbs%
exit /b

:show <msg>
  title %1
  echo %1
exit /b
