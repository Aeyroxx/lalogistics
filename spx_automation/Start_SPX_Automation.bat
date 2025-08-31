@echo off
echo ========================================
echo SPX Audit Automation Launcher
echo ========================================
echo.
echo Starting SPX Audit Automation...
echo Output files will be saved in the 'output' folder
echo.

:: Change to the script directory
cd /d "%~dp0"

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ and try again
    pause
    exit /b 1
)

:: Check if required packages are installed
echo Checking Python packages...
python -c "import selenium, pandas, openpyxl" >nul 2>&1
if errorlevel 1 (
    echo Some required packages are missing. Installing...
    pip install selenium pandas openpyxl webdriver-manager
    if errorlevel 1 (
        echo ERROR: Failed to install required packages
        pause
        exit /b 1
    )
)

:: Run the automation
echo.
echo ========================================
echo Running SPX Audit Automation
echo ========================================
python spx_audit_automation.py

:: Keep window open if there's an error
if errorlevel 1 (
    echo.
    echo ========================================
    echo Process completed with errors
    echo ========================================
    pause
) else (
    echo.
    echo ========================================
    echo Process completed successfully
    echo Check the 'output' folder for results
    echo ========================================
    timeout /t 5 /nobreak >nul
)
