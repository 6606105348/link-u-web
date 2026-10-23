@echo off
chcp 65001 >nul
title Link U - Maejo University Campus Job Matching Platform
echo ====================================================================
echo   Link U - เว็บไซต์จัดหางานและทักษะ มหาวิทยาลัยแม่โจ้
echo   ระบบกำลังเริ่มทำงานที่ http://localhost:5173/ ...
echo ====================================================================
start http://localhost:5173/
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 5173
pause
