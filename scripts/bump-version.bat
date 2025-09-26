@echo off
REM Version bumping script for FilterFox (Windows)

setlocal enabledelayedexpansion

if "%1"=="" (
    echo Usage: %0 [major^|minor^|patch^|beta^|alpha]
    echo Examples:
    echo   %0 patch    # 1.0.0 -^> 1.0.1
    echo   %0 minor    # 1.0.0 -^> 1.1.0  
    echo   %0 major    # 1.0.0 -^> 2.0.0
    echo   %0 beta     # 1.0.0 -^> 1.1.0-beta
    echo   %0 alpha    # 1.0.0 -^> 1.1.0-alpha
    exit /b 1
)

set VERSION_TYPE=%1

REM Get current version from package.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" package.json') do (
    set CURRENT_VERSION=%%a
    set CURRENT_VERSION=!CURRENT_VERSION:"=!
    set CURRENT_VERSION=!CURRENT_VERSION:,=!
    set CURRENT_VERSION=!CURRENT_VERSION: =!
)

echo Current version: %CURRENT_VERSION%

REM Update version using npm
if "%VERSION_TYPE%"=="major" npm version major --no-git-tag-version
if "%VERSION_TYPE%"=="minor" npm version minor --no-git-tag-version  
if "%VERSION_TYPE%"=="patch" npm version patch --no-git-tag-version
if "%VERSION_TYPE%"=="beta" npm version preminor --preid=beta --no-git-tag-version
if "%VERSION_TYPE%"=="alpha" npm version preminor --preid=alpha --no-git-tag-version

REM Get new version
for /f "tokens=2 delims=:" %%a in ('findstr "version" package.json') do (
    set NEW_VERSION=%%a
    set NEW_VERSION=!NEW_VERSION:"=!
    set NEW_VERSION=!NEW_VERSION:,=!
    set NEW_VERSION=!NEW_VERSION: =!
)

echo New version: %NEW_VERSION%

REM Update manifest.json
powershell -Command "(Get-Content manifest.json) -replace '\"version\": \"%CURRENT_VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content manifest.json"

echo Version updated successfully!
echo.
echo Next steps:
echo 1. Review the changes: git diff
echo 2. Commit: git add . && git commit -m "Bump version to %NEW_VERSION%"
echo 3. Tag and push: git tag -a v%NEW_VERSION% -m "FilterFox v%NEW_VERSION%" && git push origin main && git push origin v%NEW_VERSION%

pause