@echo off
cd /d "%~dp0"
echo [AI Proxy] 启动中，端口 5000 ...
python ai_proxy.py
pause
