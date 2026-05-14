#!/bin/bash

# 一键关闭：寻纹归迹项目端口
# 会关闭 4180、4181、4173 三个端口

echo "正在关闭端口 4180、4181、4173..."

for PORT in 4180 4181 4173; do
  PIDS=$(lsof -ti tcp:$PORT)
  if [ -n "$PIDS" ]; then
    echo "关闭端口 $PORT：PID $PIDS"
    kill -9 $PIDS 2>/dev/null
  else
    echo "端口 $PORT 没有运行"
  fi
done

echo ""
echo "已尝试关闭全部服务。"
read -n 1 -s -r -p "按任意键退出..."
