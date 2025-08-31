#!/bin/bash

echo "=========================================="
echo "Completing L&A Logistics Portal Deployment"
echo "=========================================="

# Install npm
echo "📦 Installing npm..."
apt update
apt install -y npm

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt install -y git

# Clone the repository
echo "📥 Cloning L&A Logistics Portal..."
cd /opt
git clone https://github.com/Aeyroxx/lalogistics.git

# Set up the application
echo "🔧 Setting up application..."
cd /opt/lalogistics
npm install

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env << 'EOF'
# Environment Configuration
NODE_ENV=production
PORT=3000

# External MongoDB Configuration
MONGODB_URI=mongodb://192.168.0.140:27017/lalogistics

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# JWT Configuration  
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Upload Configuration
UPLOAD_PATH=./public/uploads

# Application Configuration
APP_NAME=L&A Logistics Portal
APP_URL=http://localhost:3000
EOF

# Create PM2 ecosystem file
echo "🔧 Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'lalogistics',
    script: 'app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data /opt/lalogistics
chmod -R 755 /opt/lalogistics
chmod -R 777 /opt/lalogistics/public/uploads

# Create systemd service for PM2
echo "⚡ Creating systemd service..."
cat > /etc/systemd/system/lalogistics.service << 'EOF'
[Unit]
Description=L&A Logistics Portal
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/opt/lalogistics
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
echo "🚀 Starting L&A Logistics Portal..."
systemctl daemon-reload
systemctl enable lalogistics
cd /opt/lalogistics
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd

echo ""
echo "=========================================="
echo "✅ L&A Logistics Portal Deployment Complete!"
echo "=========================================="
echo ""
echo "📍 Application Details:"
echo "   • Location: /opt/lalogistics"
echo "   • Port: 3000"
echo "   • Process Manager: PM2"
echo "   • Database: mongodb://192.168.0.140:27017/lalogistics"
echo ""
echo "🔧 Management Commands:"
echo "   • Check status: pm2 status"
echo "   • View logs: pm2 logs lalogistics"
echo "   • Restart: pm2 restart lalogistics"
echo "   • Stop: pm2 stop lalogistics"
echo ""
echo "🌐 Access your application at: http://YOUR_SERVER_IP:3000"
echo ""
echo "⚠️  Important: Make sure your MongoDB server at 192.168.0.140:27017 is accessible"
echo "⚠️  Change the default secrets in /opt/lalogistics/.env for production use"
echo ""
echo "🎉 Happy logistics management!"
