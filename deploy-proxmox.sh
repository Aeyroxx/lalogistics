#!/bin/bash

# L&A Logistics Portal - Quick Deployment Script for Proxmox LXC
# This script automates the deployment process on Ubuntu LXC containers

set -e  # Exit on any error

echo "========================================"
echo "L&A Logistics Portal - Quick Deployment"
echo "========================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root"
    exit 1
fi

# Function to check command success
check_command() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 completed successfully"
    else
        echo "❌ $1 failed"
        exit 1
    fi
}

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y
check_command "System update"

# Install Node.js
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
check_command "Node.js installation"

# Note: Using external MongoDB server - skipping local MongoDB installation
echo "📡 Using external MongoDB server (will be configured in .env)"
echo "✅ Skipping local MongoDB installation"

# Install PM2 and Git
echo "📦 Installing PM2 and Git..."
npm install -g pm2
apt install -y git
check_command "PM2 and Git installation"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/lalogistics
cd /opt/lalogistics
check_command "Directory creation"

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/Aeyroxx/lalogistics.git .
check_command "Repository cloning"

# Install dependencies
echo "📦 Installing application dependencies..."
npm install
check_command "Dependencies installation"

# Create environment file
echo "⚙️  Creating environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    
    # Generate random secrets
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    # Update .env file with your MongoDB server
    sed -i "s/your_jwt_secret_here_replace_with_random_string/$JWT_SECRET/" .env
    sed -i "s/your_session_secret_here_replace_with_random_string/$SESSION_SECRET/" .env
    sed -i "s/NODE_ENV=development/NODE_ENV=production/" .env
    # Keep your existing MongoDB URI (192.168.0.140:27017)
    
    echo "✅ Environment file created with secure secrets"
    echo "📡 Using your MongoDB server at: 192.168.0.140:27017"
else
    echo "✅ Environment file already exists"
fi

# Create log directory
echo "📋 Creating log directory..."
mkdir -p /var/log/lalogistics
check_command "Log directory creation"

# Initialize database with admin user (using external MongoDB)
echo "👤 Creating initial admin user on external MongoDB..."
echo "📡 Connecting to MongoDB at 192.168.0.140:27017..."
node utils/seedAdmin.js
check_command "Admin user creation"

# Start application with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup --auto-restart
check_command "Application startup"

# Install and configure Nginx (optional)
read -p "Do you want to install Nginx reverse proxy? (y/n): " install_nginx
if [ "$install_nginx" = "y" ] || [ "$install_nginx" = "Y" ]; then
    echo "📦 Installing Nginx..."
    apt install -y nginx
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/lalogistics << EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/lalogistics /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx && systemctl enable nginx
    check_command "Nginx configuration"
fi

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
if [ "$install_nginx" != "y" ] && [ "$install_nginx" != "Y" ]; then
    ufw allow 3000
fi
ufw --force enable
check_command "Firewall configuration"

# Create backup script
echo "💾 Creating backup script..."
cat > /opt/backup-lalogistics.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Backup MongoDB from external server
mongodump --uri="mongodb://192.168.0.140:27017/lalogistics" --out $BACKUP_DIR/mongo_$DATE

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/lalogistics

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/backup-lalogistics.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-lalogistics.sh") | crontab -
check_command "Backup script creation"

# Get container IP
CONTAINER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "🎉 Deployment completed successfully!"
echo "========================================"
echo ""
echo "📋 Deployment Summary:"
echo "  • Application: L&A Logistics Portal"
echo "  • Location: /opt/lalogistics"
echo "  • Database: External MongoDB (192.168.0.140:27017)"
echo "  • Process Manager: PM2"
if [ "$install_nginx" = "y" ] || [ "$install_nginx" = "Y" ]; then
    echo "  • Web Server: Nginx (reverse proxy)"
    echo "  • Access URL: http://$CONTAINER_IP"
else
    echo "  • Access URL: http://$CONTAINER_IP:3000"
fi
echo ""
echo "👤 Default Admin Credentials:"
echo "  • Email: admin@lalogistics.com"
echo "  • Password: admin123"
echo "  • ⚠️  CHANGE THESE CREDENTIALS IMMEDIATELY!"
echo ""
echo "🔧 Management Commands:"
echo "  • View application status: pm2 status"
echo "  • View logs: pm2 logs lalogistics"
echo "  • Restart application: pm2 restart lalogistics"
echo "  • Update application: cd /opt/lalogistics && git pull && npm install && pm2 restart lalogistics"
echo ""
echo "📁 Important Files:"
echo "  • Environment: /opt/lalogistics/.env"
echo "  • Logs: /var/log/lalogistics/"
echo "  • Backup script: /opt/backup-lalogistics.sh"
echo ""
echo "✅ Your L&A Logistics Portal is ready for use!"
echo "   Access it at the URL above and login with the admin credentials."
echo ""
