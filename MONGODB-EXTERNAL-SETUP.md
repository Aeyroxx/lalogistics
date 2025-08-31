# External MongoDB Configuration

## 🔧 MongoDB Server Setup

This application is configured to use an **external MongoDB server** at:
- **Host:** `192.168.0.140`
- **Port:** `27017`
- **Database:** `lalogistics`

## 📡 Connection Requirements

### Network Prerequisites
1. **Container Network Access:** Your Proxmox LXC container must be able to reach `192.168.0.140:27017`
2. **MongoDB Server:** Must be running and accessible on the network
3. **Firewall:** Port 27017 should be open on the MongoDB server

### Testing Connection
Before deployment, verify connectivity:
```bash
# Test network connectivity
ping 192.168.0.140

# Test MongoDB port access
telnet 192.168.0.140 27017

# Test MongoDB connection (after installing mongosh)
mongosh "mongodb://192.168.0.140:27017/lalogistics" --eval "db.runCommand({ping: 1})"
```

## ⚙️ Environment Configuration

The application uses these connection settings in `.env`:
```env
MONGODB_URI=mongodb://192.168.0.140:27017/lalogistics
```

## 🔒 Security Considerations

### Current Setup (No Authentication)
- Connection string: `mongodb://192.168.0.140:27017/lalogistics`
- No username/password required

### For Production (Recommended)
If your MongoDB server uses authentication:
```env
MONGODB_URI=mongodb://username:password@192.168.0.140:27017/lalogistics
```

## 📊 Database Management

### Backup External Database
```bash
# Create backup
mongodump --uri="mongodb://192.168.0.140:27017/lalogistics" --out /tmp/backup

# Restore backup
mongorestore --uri="mongodb://192.168.0.140:27017/lalogistics" /tmp/backup/lalogistics
```

### Database Administration
```bash
# Connect to database
mongosh "mongodb://192.168.0.140:27017/lalogistics"

# Check collections
use lalogistics
show collections

# Check database stats
db.stats()
```

## 🚨 Troubleshooting

### Common Issues

1. **Cannot connect to MongoDB:**
   - Check if MongoDB server is running: `systemctl status mongod` (on MongoDB server)
   - Verify network connectivity: `ping 192.168.0.140`
   - Check firewall rules on MongoDB server

2. **Connection timeout:**
   - Verify MongoDB is bound to all interfaces (not just localhost)
   - Check MongoDB configuration: `/etc/mongod.conf` on server
   - Ensure `bindIp: 0.0.0.0` or include your container's IP

3. **Authentication errors:**
   - Update `.env` with correct credentials
   - Verify user permissions on MongoDB server

### MongoDB Server Configuration
On your MongoDB server (`192.168.0.140`), ensure:

```yaml
# /etc/mongod.conf
net:
  port: 27017
  bindIp: 0.0.0.0  # Allow connections from any IP
```

Then restart MongoDB:
```bash
sudo systemctl restart mongod
```

## 📞 Support

If you encounter connection issues:
1. Verify MongoDB server status on `192.168.0.140`
2. Check network connectivity between container and MongoDB server
3. Review MongoDB server logs: `/var/log/mongodb/mongod.log`
