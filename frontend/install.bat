@echo off
echo Installing Strategic Contract AI...
echo.

echo Installing Python dependencies...
pip install flask==3.0.0
pip install flask-cors==4.0.0
pip install requests==2.32.5

echo.
echo ✅ Installation complete!
echo.
echo To run the system:
echo 1. python simple-backend.py
echo 2. Open contract-index.html in browser
echo.
pause