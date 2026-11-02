@echo off
rem 本地安装插件的 cmd 入口。逻辑都在 install-local.mjs 里,这里只负责调用,参数原样透传。
rem 用法: scripts\install-local.cmd [--dry-run] [--dir <dataDir>] [--keep N]
setlocal

rem mjs 输出的是中文,切到 UTF-8 免得乱码
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
    echo 找不到 node,请先安装 Node.js 并加入 PATH
    set "CODE=1"
    goto end
)

node "%~dp0install-local.mjs" %*
set "CODE=%ERRORLEVEL%"

:end
rem 双击运行时窗口会立刻关掉,停一下好看清输出
rem 写全路径:Git Bash 等环境的 PATH 里排在前面的 find 是 GNU find,不认 /i
echo %CMDCMDLINE% | "%SystemRoot%\System32\find.exe" /i "%~f0" >nul && pause
exit /b %CODE%
