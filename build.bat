@echo off
REM Build script for FilterFox extension (Windows)

echo 🦊 Building FilterFox Extension...

REM Create build directory
if not exist "build" mkdir build

REM Copy essential files for extension
copy manifest.json build\ >nul
xcopy src build\src\ /E /I /Q >nul
xcopy popup build\popup\ /E /I /Q >nul
xcopy styles build\styles\ /E /I /Q >nul
xcopy icons build\icons\ /E /I /Q >nul
xcopy rules build\rules\ /E /I /Q >nul
xcopy config build\config\ /E /I /Q >nul

REM Create Chrome extension package
cd build
powershell Compress-Archive -Path "*" -DestinationPath "../FilterFox-Chrome-v1.0.0.zip" -Force
cd ..

REM Create source code package (excluding build artifacts)
powershell Compress-Archive -Path "src","popup","styles","icons","rules","config","manifest.json","package.json","README.md","LICENSE" -DestinationPath "FilterFox-Source-v1.0.0.zip" -Force

echo ✅ Build complete!
echo 📦 Chrome Extension: FilterFox-Chrome-v1.0.0.zip
echo 📦 Source Code: FilterFox-Source-v1.0.0.zip

pause