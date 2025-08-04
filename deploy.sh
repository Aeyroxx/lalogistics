#!/bin/bash

# L&A Logistics - Quick Deployment Script for Portainer
# This script helps you prepare the application for Docker deployment

echo "🚀 L&A Logistics - Docker Deployment Setup"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    
    # Generate a random session secret
    SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
    sed -i "s/your-super-secret-session-key-change-this/$SESSION_SECRET/" .env
    
    echo "✅ Environment file created (.env)"
    echo "⚠️  Please review and update .env with your specific settings"
else
    echo "✅ Environment file already exists"
fi

# Build and start containers locally (for testing)
echo ""
echo "🔨 Building Docker containers..."
docker-compose build

echo ""
echo "✅ Setup complete! Here's what you can do next:"
echo ""
echo "🐳 For Local Testing:"
echo "   docker-compose up -d"
echo "   Then visit: http://localhost:3000"
echo ""
echo "📦 For Portainer Deployment:"
echo "   1. Access your Portainer web interface"
echo "   2. Go to 'Stacks' and click 'Add stack'"
echo "   3. Name it: lalogistics"
echo "   4. Upload the docker-compose.yml file"
echo "   5. Add environment variables from .env file"
echo "   6. Deploy the stack"
echo ""
echo "📚 For detailed instructions, see: DEPLOYMENT.md"
echo ""
echo "🔧 Useful commands:"
echo "   docker-compose ps              # Check container status"
echo "   docker-compose logs -f app     # View app logs"
echo "   docker-compose down            # Stop containers"
echo ""

# Show current directory contents
echo "📁 Files ready for deployment:"
ls -la Dockerfile docker-compose.yml .env* *.md 2>/dev/null

echo ""
echo "🎉 Ready for deployment!"
