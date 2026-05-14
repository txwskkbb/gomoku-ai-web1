@echo off
chcp 65001 >nul
setlocal

REM ================================
REM Windows 一键关闭脚本
REM 会关闭占用 4173 / 4180 / 4181 的进程
REM ================================

set PORTS=4173 4180 4181

echo 正在关闭本地服务端口: %PORTS%
echo.

for %%P in (%PORTS%) do (
  echo 检查端口 %%P ...
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
    echo 正在结束 PID %%A，占用端口 %%P
    taskkill /F /PID %%A >nul 2>nul
  )
)

echo.
echo 已关闭 4173 / 4180 / 4181 对应的本地服务。
pause
