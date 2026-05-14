#!/bin/bash

# 一键启动：寻纹归迹项目
# 放在任意位置都可以双击运行。
# 默认项目目录：桌面/可视化交互网页

PROJECT_DIR="$HOME/可视化交互网页"
EFFECT_DIR="$PROJECT_DIR/1x/特效"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "找不到项目目录：$PROJECT_DIR"
  echo "请确认“可视化交互网页”文件夹在桌面上。"
  read -n 1 -s -r -p "按任意键退出..."
  exit 1
fi

if [ ! -d "$EFFECT_DIR" ]; then
  echo "找不到特效目录：$EFFECT_DIR"
  echo "请确认 1x/特效 文件夹存在。"
  read -n 1 -s -r -p "按任意键退出..."
  exit 1
fi

echo "正在关闭旧端口..."
for PORT in 4180 4181 4173; do
  PIDS=$(lsof -ti tcp:$PORT)
  if [ -n "$PIDS" ]; then
    kill -9 $PIDS 2>/dev/null
  fi
done

echo "正在启动 4180：主项目"
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_DIR' && npx --yes serve -l 4180 .\""

echo "正在启动 4181：备用 Python 服务"
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_DIR' && python3 -m http.server 4181\""

echo "正在启动 4173：特效服务"
osascript -e "tell application \"Terminal\" to do script \"cd '$EFFECT_DIR' && npx --yes serve -l 4173 .\""

sleep 3

echo "正在打开网页..."
open "http://127.0.0.1:4180/dance-stage.html"

echo ""
echo "启动完成。"
echo "主页面：http://127.0.0.1:4180/dance-stage.html"
echo "特效页：http://127.0.0.1:4173/"
echo ""
read -n 1 -s -r -p "按任意键关闭这个提示窗口..."
