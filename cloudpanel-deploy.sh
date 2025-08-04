#!/bin/bash
# CloudPanel Deployment Script for L&A Logistics

echo "🚀 Starting L&A Logistics deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Create required directories
echo "📁 Creating directories..."
mkdir -p public/uploads/profile
mkdir -p public/uploads/ids
mkdir -p logs

# Set permissions
echo "🔒 Setting permissions..."
chmod -R 755 public/uploads
chmod -R 755 logs

# Start the application with PM2
echo "🌟 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save

echo "✅ Deployment complete!"
echo "📍 Application should be running on port 3000"
echo "🔗 Access your app at: http://your-domain.com"
echo ""
echo "📋 Useful PM2 commands:"
echo "  pm2 status      - Check app status"
echo "  pm2 logs        - View logs"
echo "  pm2 restart all - Restart app"
echo "  pm2 stop all    - Stop app"
