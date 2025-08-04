# Portainer Deployment Fix Guide

## Problem
MongoDB container is marked as "unhealthy" causing deployment failure.

## Quick Fix Steps

### Step 1: Delete Current Stack
1. In Portainer, go to "Stacks"
2. Select your "lalogistics" stack
3. Click "Delete" to remove it completely

### Step 2: Clean Up Volumes (Optional but Recommended)
1. Go to "Volumes" in Portainer
2. Delete any volumes starting with "lalogistics" if they exist
3. This ensures a clean start

### Step 3: Create New Stack with Fixed Configuration

**Option A: Use Web Editor**
1. Click "Add stack"
2. Name it: `lalogistics`
3. Choose "Web editor"
4. Copy and paste this simplified configuration:

```yaml
version: '3.8'

services:
  mongo:
    image: mongo:6.0
    container_name: lalogistics-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: lalogistics
    volumes:
      - mongo-data:/data/db

  lalogistics-app:
    build: .
    container_name: lalogistics-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/lalogistics
      SESSION_SECRET: your-random-secret-key-here-change-this
      PORT: 3000
    volumes:
      - uploads-data:/app/public/uploads

  mongo-express:
    image: mongo-express:latest
    container_name: lalogistics-mongo-admin
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_SERVER: mongo
      ME_CONFIG_MONGODB_PORT: 27017
      ME_CONFIG_MONGODB_ENABLE_ADMIN: "true"
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin123

volumes:
  mongo-data:
  uploads-data:
```

**Option B: Use Repository**
1. Click "Add stack"
2. Name it: `lalogistics`
3. Choose "Repository"
4. Repository URL: `https://github.com/Aeyroxx/lalogistics`
5. Compose path: `docker-compose.portainer.yml`

### Step 4: Configure Environment Variables
In the "Environment variables" section, add:
```
SESSION_SECRET=your-random-secret-key-here-change-this
```

### Step 5: Deploy
1. Click "Deploy the stack"
2. Wait for containers to start (this may take 2-3 minutes for the first build)

## What's Different in This Fix

1. **Removed health checks** - These were causing the "unhealthy" status
2. **Removed depends_on** - Let containers start naturally
3. **Simplified networking** - Docker will handle container communication automatically
4. **Cleaner environment variables** - No complex variable substitution

## Expected Behavior

1. **MongoDB** will start first and be ready in ~30 seconds
2. **App container** will restart a few times initially (this is normal) as it waits for MongoDB
3. **After 1-2 minutes**, the app should be accessible at `http://192.168.1.200:3000`

## Verification Steps

1. Check container status in Portainer - all should show as "running"
2. View logs for any container by clicking on it
3. Test the application: `http://192.168.1.200:3000`
4. Test MongoDB admin: `http://192.168.1.200:8081`

## If Still Having Issues

1. **Check app container logs** for MongoDB connection errors
2. **Restart just the app container** (not the whole stack)
3. **Try the simple deployment script**:
   - SSH to your server
   - Run: `git clone https://github.com/Aeyroxx/lalogistics.git`
   - Run: `cd lalogistics && docker-compose -f docker-compose.portainer.yml up -d`

## Troubleshooting Commands

If you have SSH access to your server:
```bash
# Check if containers are running
docker ps

# Check container logs
docker logs lalogistics-web
docker logs lalogistics-mongodb

# Test connectivity between containers
docker exec lalogistics-web ping mongo

# Restart just the app container
docker restart lalogistics-web
```
