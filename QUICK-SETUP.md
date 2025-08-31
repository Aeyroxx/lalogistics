# L&A Logistics Portal - Quick Setup

## 🚀 One-Command Deployment (Recommended)

For the fastest deployment on your Proxmox LXC container:

```bash
# 1. Create Ubuntu 20.04/22.04 LXC container in Proxmox
# 2. Start container and access console/SSH
# 3. Run the quick deployment script:

wget -O - https://raw.githubusercontent.com/Aeyroxx/lalogistics/master/deploy-proxmox.sh | bash
```

This script will automatically:
- ✅ Install Node.js, MongoDB, PM2, Git
- ✅ Clone the repository
- ✅ Install dependencies  
- ✅ Configure environment with secure secrets
- ✅ Create admin user
- ✅ Start the application
- ✅ Setup Nginx reverse proxy (optional)
- ✅ Configure firewall
- ✅ Setup automatic backups

## 📖 Manual Deployment

If you prefer step-by-step manual deployment, see: [PROXMOX-LXC-DEPLOYMENT.md](PROXMOX-LXC-DEPLOYMENT.md)

## 🔐 Default Login

After deployment, access your application and login with:
- **Email:** `admin@lalogistics.com`
- **Password:** `admin123`

**⚠️ IMPORTANT: Change these credentials immediately after first login!**

## 🎯 What You Get

✅ **Complete Seller Labels System**
- Automatic label application to existing audit entries
- Bulk apply functionality
- Auto-application on new audit creation

✅ **Audit Management**
- SPX and Flash Express audit tracking
- Automatic earnings calculations
- Import/Export functionality
- Multi-seller search

✅ **Dashboard & Reports**
- Real-time earnings tracking
- Visual charts and statistics
- PDF export capabilities

✅ **User Management**
- Role-based access control
- Employee profiles with ID cards
- Profile picture management

## 🌐 Access Your Application

After deployment:
- **With Nginx:** `http://[CONTAINER_IP]`
- **Direct access:** `http://[CONTAINER_IP]:3000`

## 📞 Support

Repository: https://github.com/Aeyroxx/lalogistics
Issues: https://github.com/Aeyroxx/lalogistics/issues
