@echo off
echo Installing SPX Audit Automation Requirements
echo ==========================================

echo.
echo Installing Python packages...
pip install -r requirements_spx.txt

echo.
echo Installation completed!
echo.
echo You can now run the automation with:
echo python spx_audit_automation_enhanced.py
echo.
pause
