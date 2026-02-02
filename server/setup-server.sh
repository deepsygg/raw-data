#!/bin/bash

# Initial setup script for Ubuntu server
# Run this ONCE on the server: bash setup-server.sh

echo "🔧 Setting up raw.data server..."

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Setup PM2 startup
echo "⚙️  Setting up PM2 auto-start..."
pm2 startup systemd -u root --hp /root
pm2 save

# Create directory for server
mkdir -p /root/rawdata-server

# Setup firewall (allow SSH and port 3000)
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"
echo ""
echo "Next steps:"
echo "  1. Exit from server (type 'exit')"
echo "  2. Run './deploy.sh' from your local machine"
