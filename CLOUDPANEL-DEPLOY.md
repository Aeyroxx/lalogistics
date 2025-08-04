# 🌐 CloudPanel Deployment Guide - L&A Logistics

## Prerequisites
- CloudPanel server with Node.js support
- MongoDB accessible at `192.168.1.200:27017`
- Git access to your repository

## Quick Deployment Steps

### Step 1: Create Site in CloudPanel
1. **Login to CloudPanel**
2. **Go to Sites** → **Add Site**
3. **Site Type**: Node.js
4. **Domain**: your-domain.com (or subdomain)
5. **Node.js Version**: 18.x or higher
6. **Document Root**: `/htdocs`

### Step 2: Deploy from Git
1. **Go to your site** → **Git**
2. **Repository URL**: `https://github.com/Aeyroxx/lalogistics.git`
3. **Branch**: `master`
4. **Click "Clone Repository"**

### Step 3: Set Environment Variables
1. **Go to your site** → **Node.js** → **Environment Variables**
2. **Add these variables**:
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://192.168.1.200:27017/lalogistics
SESSION_SECRET=LA2025-cloudpanel-secure-session-key
JWT_SECRET=2b2dd9130467a3aa846f4096044d64d3
```

### Step 4: Configure Application
1. **Go to Node.js settings**
2. **App Root**: `/` (should be default)
3. **Startup File**: `app.js`
4. **App Port**: `3000`

### Step 5: Install Dependencies & Start
1. **SSH into your server** or use CloudPanel terminal
2. **Navigate to your site directory**:
   ```bash
   cd /home/your-site/htdocs/
   ```
3. **Run deployment script**:
   ```bash
   chmod +x cloudpanel-deploy.sh
   ./cloudpanel-deploy.sh
   ```

   OR manually:
   ```bash
   npm ci --only=production
   mkdir -p public/uploads/profile public/uploads/ids logs
   chmod -R 755 public/uploads logs
   pm2 start ecosystem.config.js
   pm2 save
   ```

### Step 6: Configure Reverse Proxy (if needed)
1. **Go to your site** → **Vhosts**
2. **Add location**:
   ```
   location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

### Step 7: SSL Certificate (Recommended)
1. **Go to your site** → **SSL/TLS**
2. **Enable Let's Encrypt** for free SSL
3. **Force HTTPS redirect**

## Verification Steps

### Check Application Status
```bash
pm2 status
pm2 logs lalogistics
```

### Test Application
- **URL**: `https://your-domain.com`
- **Login**: `test@lalogistics.com` / `password123`

### Monitor Logs
```bash
pm2 logs --lines 50
tail -f logs/combined.log
```

## File Structure in CloudPanel
```
/home/your-site/htdocs/
├── app.js                 # Main application
├── package.json           # Dependencies
├── ecosystem.config.js    # PM2 configuration
├── public/
│   └── uploads/          # User uploads (auto-created)
├── logs/                 # Application logs (auto-created)
└── ... (rest of your app files)
```

## Troubleshooting

### Application Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Check PM2 status
pm2 status
pm2 describe lalogistics

# Check logs
pm2 logs lalogistics --lines 100
```

### Database Connection Issues
```bash
# Test MongoDB connectivity
telnet 192.168.1.200 27017

# Check environment variables
pm2 show lalogistics
```

### File Upload Issues
```bash
# Check upload directory permissions
ls -la public/uploads/
chmod -R 755 public/uploads/
```

## Updating the Application

### Method 1: Git Pull (Recommended)
```bash
cd /home/your-site/htdocs/
git pull origin master
npm ci --only=production
pm2 restart lalogistics
```

### Method 2: CloudPanel Git Interface
1. **Go to your site** → **Git**
2. **Click "Pull"** to get latest changes
3. **Restart application** in Node.js section

## Performance Optimization

### PM2 Cluster Mode (for multiple CPU cores)
Edit `ecosystem.config.js`:
```javascript
instances: "max"  // Use all CPU cores
```

### Memory Management
```bash
# Monitor memory usage
pm2 monit

# Restart if memory usage is high
pm2 restart lalogistics
```

## Backup Strategy

### Database Backup
```bash
# MongoDB backup (run from a machine with mongodump)
mongodump --host 192.168.1.200:27017 --db lalogistics --out ./backup/
```

### File Uploads Backup
```bash
# Backup uploaded files
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz public/uploads/
```

## Security Recommendations

1. **Change default session secret** in environment variables
2. **Enable CloudPanel firewall** to restrict access
3. **Use SSL/HTTPS** for all traffic
4. **Regular security updates** via CloudPanel
5. **Monitor logs** for suspicious activity

## Support & Monitoring

### CloudPanel Monitoring
- Use built-in monitoring for CPU, memory, and disk usage
- Set up alerts for downtime

### Application Monitoring
```bash
# Real-time logs
pm2 logs lalogistics --lines 0

# Application metrics
pm2 monit
```

Your L&A Logistics application should now be running smoothly on CloudPanel! 🚀
