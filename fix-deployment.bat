@echo off
REM Quick fix script for MongoDB connection issues on Windows

echo === L&A Logistics Docker Fix Script ===
echo.

REM Stop all containers
echo 1. Stopping all containers...
docker-compose down

echo.
echo 2. Removing any orphaned containers...
docker system prune -f

echo.
echo 3. Starting MongoDB first...
docker-compose up -d mongo

echo.
echo 4. Waiting for MongoDB to be ready (30 seconds)...
timeout /t 30 /nobreak

echo.
echo 5. Checking MongoDB status...
docker exec lalogistics-mongodb mongosh --eval "db.adminCommand('ping')" || echo MongoDB not ready yet, continuing anyway...

echo.
echo 6. Starting the application...
docker-compose up -d lalogistics-app

echo.
echo 7. Starting Mongo Express admin...
docker-compose up -d mongo-express

echo.
echo 8. Checking container status...
docker-compose ps

echo.
echo === Fix complete! ===
echo Application should be available at: http://192.168.1.200:3000
echo MongoDB Admin at: http://192.168.1.200:8081
echo.
echo If still having issues, check logs with:
echo   docker logs lalogistics-web
echo   docker logs lalogistics-mongodb

pause
