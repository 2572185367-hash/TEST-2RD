#!/bin/bash
# ========================================
#  论文关键词检索 - 阿里云 ECS 部署脚本
#  Usage: bash deploy.sh
# ========================================

set -e

echo ">>> 更新系统并安装依赖..."
sudo apt update -y
sudo apt install -y nodejs npm nginx git

# 安装 Node 18 (如果版本太低)
node -v | grep -q "v18" || {
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
}

echo ">>> 安装 PM2 进程管理器..."
sudo npm install -g pm2

echo ">>> 克隆项目..."
cd /home
if [ -d "paper-keyword-search" ]; then
  cd paper-keyword-search && git pull
else
  git clone git@github.com:2572185367-hash/TEST-2RD.git paper-keyword-search
  cd paper-keyword-search
fi

echo ">>> 安装依赖..."
npm install --omit=dev

echo ">>> 启动服务 (PM2)..."
pm2 delete paper-search 2>/dev/null || true
pm2 start server.js --name paper-search -- --port 3001
pm2 save
pm2 startup

echo ">>> 配置 Nginx 反向代理 (可选)..."
# 如需域名 + HTTPS，取消下面注释并替换 your-domain.com
# sudo tee /etc/nginx/sites-available/paper-search << 'EOF'
# server {
#     listen 80;
#     server_name your-domain.com;
#     location / {
#         proxy_pass http://127.0.0.1:3001;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
# EOF
# sudo ln -sf /etc/nginx/sites-available/paper-search /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "========================================"
echo "  部署完成！"
echo "  访问: http://$(curl -s ifconfig.me):3001"
echo "========================================"
