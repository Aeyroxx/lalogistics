# L&A Logistics - Portainer Deployment Guide

## Prerequisites

1. **Portainer** installed and running on your server
2. **Docker** and **Docker Compose** installed on your host system
3. **Git** installed to clone the repository (or file upload capability)

## Deployment Steps

### Option 1: Using Portainer Stacks (Recommended)

1. **Access Portainer**
   - Open your Portainer web interface
   - Navigate to "Stacks" in the left sidebar

2. **Create New Stack**
   - Click "Add stack"
   - Name it: `lalogistics`

3. **Upload Docker Compose**
   - Choose "Upload" option
   - Upload the `docker-compose.yml` file from this project
   
   OR
   
   - Choose "Web editor" and paste the contents of `docker-compose.yml`

4. **Configure Environment Variables**
   - Scroll down to "Environment variables"
   - Add these variables:
     ```
     SESSION_SECRET=your-random-secret-key-here
     MONGODB_URI=mongodb://mongo:27017/lalogistics
     NODE_ENV=production
     ```

5. **Deploy Stack**
   - Click "Deploy the stack"
   - Wait for containers to start (may take a few minutes for first build)

### Option 2: Using Git Repository

1. **Create Stack from Git**
   - Choose "Repository" option
   - Repository URL: `https://github.com/your-username/lalogistics` (if you pushed to GitHub)
   - Compose path: `docker-compose.yml`

2. **Configure and Deploy**
   - Add environment variables as above
   - Click "Deploy the stack"

### Option 3: Manual Docker Commands

If you prefer command line or have SSH access to your server:

```bash
# 1. Clone or upload your project to the server
git clone <your-repo-url> /opt/lalogistics
cd /opt/lalogistics

# 2. Create environment file
cp .env.example .env
nano .env  # Edit with your actual values

# 3. Build and start containers
docker-compose up -d

# 4. Check if containers are running
docker-compose ps

# 5. View logs if needed
docker-compose logs -f lalogistics-app
```

## Post-Deployment Configuration

### 1. Access Your Application
- **Web App**: `http://your-server-ip:3000`
- **MongoDB Admin**: `http://your-server-ip:8081` (username: admin, password: admin123)

### 2. Create Admin User
Since this is a fresh deployment, you'll need to create an admin user:

```bash
# Connect to the app container
docker exec -it lalogistics-web /bin/sh

# Run the admin creation script
node utils/createTestAdmin.js
```

Or create manually through MongoDB:
- Access Mongo Express at `http://your-server-ip:8081`
- Navigate to `lalogistics` database → `users` collection
- Insert a new admin user document

### 3. Security Hardening

1. **Change Default Passwords**
   - Update MongoDB admin password
   - Change SESSION_SECRET in environment variables

2. **Enable MongoDB Authentication** (Optional but recommended)
   ```yaml
   # Add to mongo service in docker-compose.yml
   environment:
     - MONGO_INITDB_ROOT_USERNAME=admin
     - MONGO_INITDB_ROOT_PASSWORD=your-secure-password
   ```

3. **Use Reverse Proxy** (Recommended)
   - Set up Nginx or Traefik in front of your application
   - Enable SSL/TLS certificates
   - Hide internal ports

### 4. Backup Strategy

1. **Database Backup**
   ```bash
   # Create backup
   docker exec lalogistics-mongodb mongodump --out /data/backup

   # Restore backup
   docker exec lalogistics-mongodb mongorestore /data/backup
   ```

2. **File Uploads Backup**
   ```bash
   # The uploads are stored in Docker volume: uploads-data
   docker run --rm -v uploads-data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
   ```

## Container Configuration

### Resource Limits
Add these to your docker-compose.yml services if needed:

```yaml
services:
  lalogistics-app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Health Checks
```yaml
  lalogistics-app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Portainer Management

### Viewing Logs
1. Go to "Containers" in Portainer
2. Click on `lalogistics-web` container
3. Click "Logs" to view application logs

### Container Management
- **Start/Stop**: Use the controls in Portainer interface
- **Restart**: Click the restart button for individual containers
- **Update**: Rebuild the stack with new images

### Volume Management
- **uploads-data**: Contains uploaded files (profile pictures, IDs)
- **mongo-data**: Contains MongoDB database files

## Troubleshooting

### Common Issues

1. **App won't start**
   - Check environment variables are set correctly
   - Verify MongoDB is running: `docker logs lalogistics-mongodb`

2. **Database connection errors**
   - Ensure MongoDB container is healthy
   - Check network connectivity between containers

3. **File upload issues**
   - Verify uploads volume is mounted correctly
   - Check container permissions

### Useful Commands
```bash
# View all containers
docker ps -a

# Check logs
docker logs lalogistics-web
docker logs lalogistics-mongodb

# Access app container shell
docker exec -it lalogistics-web /bin/sh

# Access MongoDB shell
docker exec -it lalogistics-mongodb mongosh lalogistics

# Restart specific service
docker-compose restart lalogistics-app
```

## Updating the Application

1. **Pull latest code**
2. **Rebuild containers**:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

Or in Portainer:
1. Go to your stack
2. Click "Editor"
3. Update the compose file if needed
4. Click "Update the stack"
5. Check "Re-pull image and redeploy"

## Monitoring

Consider adding monitoring tools:
- **Prometheus + Grafana** for metrics
- **Uptime monitoring** for availability
- **Log aggregation** with ELK stack

## Support

For issues specific to this deployment:
1. Check container logs in Portainer
2. Verify environment variables
3. Test database connectivity
4. Review application logs for errors
