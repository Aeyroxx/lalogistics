# 🚀 Portainer Deployment Guide - L&A Logistics

## Quick Deployment (Copy & Paste Ready)

### Step 1: Delete Old Stack
1. In Portainer, go to **Stacks**
2. If "lalogistics" stack exists, **delete it**
3. Wait for complete removal

### Step 2: Create New Stack
1. Click **"Add stack"**
2. Name: `lalogistics`
3. Choose **"Web editor"**
4. **Copy and paste this exact configuration:**

```yaml
version: '3.8'

services:
  app:
    build: https://github.com/Aeyroxx/lalogistics.git
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://192.168.1.200:27017/lalogistics
      - SESSION_SECRET=LA2025-portainer-secret-key
      - PORT=3000
    volumes:
      - app-uploads:/app/public/uploads
    restart: unless-stopped

volumes:
  app-uploads:
```

### Step 3: Deploy
1. Scroll down
2. Click **"Deploy the stack"**
3. Wait 3-5 minutes for initial build

### Step 4: Verify Deployment
- **Application**: http://192.168.1.200:3000
- **Login**: test@lalogistics.com / password123

---

## Alternative Method: Repository

1. Choose **"Repository"** instead of Web editor
2. Repository URL: `https://github.com/Aeyroxx/lalogistics`
3. Compose path: `portainer-deploy.yml`
4. Deploy

---

## Troubleshooting

### If Build Fails:
1. Check container logs in Portainer
2. Try using `docker-compose.portainer.yml` as compose path
3. Ensure GitHub repository is accessible

### If Can't Connect:
1. Verify MongoDB at 192.168.1.200:27017 is running
2. Check firewall allows port 3000
3. Test: `telnet 192.168.1.200 27017`

### If Login Fails:
- Admin user should already exist from previous setup
- Email: test@lalogistics.com
- Password: password123

---

## What This Deployment Does

✅ **Builds** application from GitHub repository  
✅ **Connects** to your MongoDB at 192.168.1.200  
✅ **Exposes** application on port 3000  
✅ **Persists** uploaded files in Docker volume  
✅ **Auto-restarts** if container crashes  

## Architecture

```
[Portainer Server] → [Docker Container] → [MongoDB at 192.168.1.200]
                          ↓
                    [Your App at :3000]
```

This is the simplest possible deployment that should work reliably in Portainer.
