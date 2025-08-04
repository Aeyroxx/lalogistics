@echo off
echo.
echo 🚀 L&A Logistics - Docker Deployment Setup
echo ==========================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating environment file...
    copy .env.example .env
    echo ✅ Environment file created (.env^)
    echo ⚠️  Please review and update .env with your specific settings
) else (
    echo ✅ Environment file already exists
)

REM Build containers
echo.
echo 🔨 Building Docker containers...
docker-compose build

echo.
echo ✅ Setup complete! Here's what you can do next:
echo.
echo 🐳 For Local Testing:
echo    docker-compose up -d
echo    Then visit: http://localhost:3000
echo.
echo 📦 For Portainer Deployment:
echo    1. Access your Portainer web interface
echo    2. Go to 'Stacks' and click 'Add stack'
echo    3. Name it: lalogistics
echo    4. Upload the docker-compose.yml file
echo    5. Add environment variables from .env file
echo    6. Deploy the stack
echo.
echo 📚 For detailed instructions, see: DEPLOYMENT.md
echo.
echo 🔧 Useful commands:
echo    docker-compose ps              # Check container status
echo    docker-compose logs -f app     # View app logs
echo    docker-compose down            # Stop containers
echo.

REM Show current directory contents
echo 📁 Files ready for deployment:
dir Dockerfile docker-compose.yml .env* *.md

echo.
echo 🎉 Ready for deployment!
pause
