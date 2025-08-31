# L&A Logistics Portal - Proxmox LXC Deployment Guide

## Prerequisites

- Proxmox VE server with LXC container support
- Ubuntu 20.04/22.04 LXC container
- Internet access from the container
- Basic knowledge of terminal/SSH commands

## Step-by-Step Deployment Process

### Step 1: Create and Setup LXC Container

1. **Create Ubuntu LXC Container in Proxmox:**
   ```bash
   # In Proxmox web interface:
   # - Create new LXC container
   # - Choose Ubuntu 20.04 or 22.04 template
   # - Allocate at least 2GB RAM, 20GB storage
   # - Enable 'Start at boot' option
   # - Configure network settings
   ```

2. **Start Container and Access Console:**
   ```bash
   # Start the container and open console in Proxmox
   # OR connect via SSH if network is configured
   ssh root@[CONTAINER_IP]
   ```

### Step 2: Install Required Software

1. **Update System:**
   ```bash
   apt update && apt upgrade -y
   ```

2. **Install Node.js 18.x (LTS):**
   ```bash
   # Install NodeSource repository
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

3. **Install MongoDB Client Tools (for database management):**
   ```bash
   # Install MongoDB client tools only (not the server)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y mongodb-clients
   
   # Test connection to your external MongoDB server
   mongosh "mongodb://192.168.0.140:27017/lalogistics" --eval "db.runCommand({ping: 1})"
   ```
   
   **Note:** This setup uses your existing MongoDB server at `192.168.0.140:27017` instead of installing a local MongoDB instance.

4. **Install PM2 (Process Manager):**
   ```bash
   npm install -g pm2
   ```

5. **Install Git:**
   ```bash
   apt install -y git
   ```

### Step 3: Deploy Application

1. **Create Application Directory:**
   ```bash
   mkdir -p /opt/lalogistics
   cd /opt/lalogistics
   ```

2. **Clone Repository:**
   ```bash
   git clone https://github.com/Aeyroxx/lalogistics.git .
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Create Production Environment File:**
   ```bash
   cp .env.example .env
   nano .env
   ```

   **Configure .env file with these values:**
   ```env
   PORT=3000
   NODE_ENV=production
   MONGODB_URI=mongodb://192.168.0.140:27017/lalogistics
   JWT_SECRET=your_super_secure_jwt_secret_change_this_random_string
   SESSION_SECRET=your_super_secure_session_secret_change_this_random_string
   ```

   **Important:** This configuration uses your external MongoDB server at `192.168.0.140:27017`

   **Generate secure secrets:**
   ```bash
   # Generate JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Generate Session secret  
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

### Step 4: Setup Database Connection and Initial Data

1. **Test MongoDB Connection:**
   ```bash
   # Test connection to your external MongoDB server
   mongosh "mongodb://192.168.0.140:27017/lalogistics" --eval "db.runCommand({ping: 1})"
   ```

2. **Create Initial Admin User:**
   ```bash
   node utils/seedAdmin.js
   ```

   This will create:
   - Database: `lalogistics` (on your external MongoDB server)
   - Admin user: `admin@lalogistics.com` / `admin123`

### Step 5: Configure PM2 for Production

1. **Create PM2 Ecosystem File:**
   ```bash
   nano ecosystem.config.js
   ```

   **Use this configuration:**
   ```javascript
   module.exports = {
     apps: [{
       name: 'lalogistics',
       script: './app.js',
       instances: 1,
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'development'
       },
       env_production: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       error_file: '/var/log/lalogistics/error.log',
       out_file: '/var/log/lalogistics/access.log',
       log_file: '/var/log/lalogistics/combined.log',
       time: true
     }]
   }
   ```

2. **Create Log Directory:**
   ```bash
   mkdir -p /var/log/lalogistics
   chown -R root:root /var/log/lalogistics
   ```

3. **Start Application with PM2:**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### Step 6: Configure Reverse Proxy (Optional but Recommended)

1. **Install Nginx:**
   ```bash
   apt install -y nginx
   ```

2. **Create Nginx Configuration:**
   ```bash
   nano /etc/nginx/sites-available/lalogistics
   ```

   **Configuration:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain or use '_' for any
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable Site:**
   ```bash
   ln -s /etc/nginx/sites-available/lalogistics /etc/nginx/sites-enabled/
   rm /etc/nginx/sites-enabled/default  # Remove default site
   nginx -t  # Test configuration
   systemctl restart nginx
   systemctl enable nginx
   ```

### Step 7: Configure Firewall

1. **Setup UFW Firewall:**
   ```bash
   ufw allow ssh
   ufw allow 80
   ufw allow 443
   ufw allow 3000  # Only if not using Nginx
   ufw --force enable
   ```

### Step 8: Create Systemd Service (Alternative to PM2)

If you prefer systemd over PM2:

```bash
nano /etc/systemd/system/lalogistics.service
```

**Service configuration:**
```ini
[Unit]
Description=L&A Logistics Portal
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lalogistics
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
systemctl daemon-reload
systemctl enable lalogistics
systemctl start lalogistics
```

## Verification and Testing

### Step 1: Check Services
```bash
# Check application status
pm2 status

# Check application logs
pm2 logs lalogistics

# Test MongoDB connection
mongosh "mongodb://192.168.0.140:27017/lalogistics" --eval "db.runCommand({connectionStatus: 1})"
```

### Step 2: Test Application
```bash
# Test local access
curl http://localhost:3000

# Check if application responds
netstat -tlnp | grep :3000
```

### Step 3: Access Application
- **Direct access:** `http://[CONTAINER_IP]:3000`
- **With Nginx:** `http://[CONTAINER_IP]` or `http://your-domain.com`

### Step 4: Login and Test
1. Open browser and navigate to your application
2. Login with: `admin@lalogistics.com` / `admin123`
3. Test seller labels functionality
4. Create audit entries
5. Verify auto-application of seller labels

## Post-Deployment Tasks

### 1. Change Default Credentials
```bash
# Access the application and change admin password
# Go to Settings > Change Password
```

### 2. Setup Automatic Backups
```bash
# Create backup script
nano /opt/backup-lalogistics.sh
```

**Backup script:**
```bash
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
```

**Make executable and add to cron:**
```bash
chmod +x /opt/backup-lalogistics.sh
(crontab -l ; echo "0 2 * * * /opt/backup-lalogistics.sh") | crontab -
```

### 3. Setup Log Rotation
```bash
nano /etc/logrotate.d/lalogistics
```

**Log rotation config:**
```
/var/log/lalogistics/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reload lalogistics
    endscript
}
```

## Maintenance Commands

### Application Management
```bash
# Restart application
pm2 restart lalogistics

# View logs
pm2 logs lalogistics

# Update application
cd /opt/lalogistics
git pull
npm install
pm2 restart lalogistics
```

### Database Management
```bash
# Connect to your external MongoDB
mongosh "mongodb://192.168.0.140:27017/lalogistics"

# Check database size
mongosh "mongodb://192.168.0.140:27017/lalogistics" --eval "db.stats()"

# Create database backup
mongodump --uri="mongodb://192.168.0.140:27017/lalogistics" --out /tmp/backup
```

## Troubleshooting

### Common Issues and Solutions

1. **Application won't start:**
   ```bash
   # Check logs
   pm2 logs lalogistics
   
   # Check environment variables
   cat .env
   
   # Test MongoDB connection
   mongosh --eval "db.runCommand({connectionStatus: 1})"
   ```

2. **Can't access from outside:**
   ```bash
   # Check firewall
   ufw status
   
   # Check if port is listening
   netstat -tlnp | grep :3000
   
   # Check Nginx (if used)
   nginx -t
   systemctl status nginx
   ```

3. **Database connection issues:**
   ```bash
   # Test connection to external MongoDB
   mongosh "mongodb://192.168.0.140:27017/lalogistics" --eval "db.runCommand({ping: 1})"
   
   # Check network connectivity to MongoDB server
   ping 192.168.0.140
   
   # Check if MongoDB port is accessible
   telnet 192.168.0.140 27017
   ```

## Security Recommendations

1. **Change default admin credentials immediately**
2. **Use strong JWT and session secrets**
3. **Enable MongoDB authentication for production**
4. **Setup SSL/TLS with Let's Encrypt**
5. **Regular security updates**
6. **Monitor application logs**
7. **Setup fail2ban for SSH protection**

Your L&A Logistics Portal is now successfully deployed and ready for production use!
