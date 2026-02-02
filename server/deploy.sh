#!/bin/bash

# Deploy script for raw.data server
# Usage: ./deploy.sh

SERVER_IP="178.18.240.104"
SERVER_USER="root"
SERVER_PATH="/root/rawdata-server"

echo "🚀 Deploying raw.data server to $SERVER_IP..."

# Создаем архив
echo "📦 Creating archive..."
tar -czf server.tar.gz \
  package.json \
  index.js \
  README.md \
  .gitignore

# Копируем на сервер
echo "📤 Uploading to server..."
scp server.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Выполняем команды на сервере
echo "⚙️  Installing on server..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'
  # Создаем директорию если нет
  mkdir -p /root/rawdata-server
  cd /root/rawdata-server
  
  # Распаковываем
  tar -xzf /tmp/server.tar.gz
  rm /tmp/server.tar.gz
  
  # Устанавливаем зависимости
  npm install
  
  # Останавливаем старый процесс если запущен
  pm2 stop rawdata-server 2>/dev/null || true
  pm2 delete rawdata-server 2>/dev/null || true
  
  # Запускаем новый
  pm2 start index.js --name rawdata-server
  pm2 save
  
  echo "✅ Server deployed and running!"
  pm2 status
EOF

# Удаляем локальный архив
rm server.tar.gz

echo ""
echo "✨ Deploy complete!"
echo "🌐 Server URL: http://$SERVER_IP:3000"
echo ""
echo "Useful commands:"
echo "  ssh root@$SERVER_IP"
echo "  pm2 logs rawdata-server    - View logs"
echo "  pm2 restart rawdata-server - Restart server"
echo "  pm2 status                  - Check status"
