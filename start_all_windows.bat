@echo off
chcp 65001 >nul
setlocal

REM ================================
REM Windows 一键启动脚本
REM 把本文件放在项目根目录后双击运行
REM ================================

REM 当前 bat 所在目录，作为 4173 和 4181 的服务目录
set "PROJECT_DIR=%~dp0"

REM 4180 对应的目录：如果你的“可视化交互网页”不在这里，请改这一行
set "VISUAL_DIR=%USERPROFILE%\可视化交互网页"

REM 端口
set "PORT_VISUAL=4180"
set "PORT_PYTHON=4181"
set "PORT_EFFECT=4173"

echo 正在启动三个本地服务...
echo.
echo 项目目录: %PROJECT_DIR%
echo 可视化目录: %VISUAL_DIR%
echo.

REM 检查 Node / npx
where npx >nul 2>nul
if errorlevel 1 (
  echo [错误] 没找到 npx。请先安装 Node.js: https://nodejs.org/
  pause
  exit /b 1
)

REM 检查 Python
where python >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo [错误] 没找到 Python。请先安装 Python，并勾选 Add Python to PATH。
    pause
    exit /b 1
  )
)

REM 如果 4180 目录不存在，给出提示，但仍然启动另外两个
if exist "%VISUAL_DIR%" (
  start "serve 4180 可视化交互网页" cmd /k "chcp 65001 >nul && npx --yes serve -l %PORT_VISUAL% "%VISUAL_DIR%""
) else (
  echo [提示] 找不到 4180 的目录: %VISUAL_DIR%
  echo       如需启动 4180，请编辑本文件里的 VISUAL_DIR。
)

REM 启动 4181：当前项目目录
where python >nul 2>nul
if not errorlevel 1 (
  start "python 4181" cmd /k "chcp 65001 >nul && cd /d "%PROJECT_DIR%" && python -m http.server %PORT_PYTHON%"
) else (
  start "python 4181" cmd /k "chcp 65001 >nul && cd /d "%PROJECT_DIR%" && py -m http.server %PORT_PYTHON%"
)

REM 启动 4173：当前项目目录
start "serve 4173" cmd /k "chcp 65001 >nul && cd /d "%PROJECT_DIR%" && npx --yes serve -l %PORT_EFFECT% ."

REM 等待服务起来后打开浏览器
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%PORT_EFFECT%/"
start "" "http://127.0.0.1:%PORT_EFFECT%/特效/"
start "" "http://127.0.0.1:%PORT_PYTHON%/"
if exist "%VISUAL_DIR%" start "" "http://127.0.0.1:%PORT_VISUAL%/"

echo.
echo 已尝试启动完成。
echo 关闭服务请双击 stop_all_windows.bat
pause
