@echo off
setlocal
:: FinCalix release builder: signed APK + AAB from android\ (signing: android\keystore.properties).
:: Usage: build-release.bat [--no-pause]
:: Note: never expand %PATH% inside a ( ... ) block - PATH entries such as
:: "C:\Program Files (x86)\..." contain ")" and end the block early. PATH is changed only
:: after :found_java, with the quoted  set "VAR=value"  form. Gradle is called by its full path:
:: cmd may not search the current folder (NoDefaultCurrentDirectoryInExePath).
echo ============================================
echo  FinCalix Release Builder
echo ============================================

set "NO_PAUSE="
if /i "%~1"=="--no-pause" set "NO_PAUSE=1"

:: Try to find Java from known locations
set "JAVA_FOUND=0"

:: Check Android Studio JBR paths
for %%J in (
    "C:\Program Files\Android\Android Studio\jbr"
    "C:\Program Files\Android\Android Studio\jre"
    "%APPDATA%\Local\Android\studio\jbr"
    "%LOCALAPPDATA%\Programs\Android Studio\jbr"
    "C:\Program Files\Eclipse Adoptium\jdk-17.0.9+9"
    "C:\Program Files\Java\jdk-17"
    "C:\Program Files\Java\jdk-21"
    "C:\Program Files\Microsoft\jdk-17"
    "C:\Program Files\Amazon Corretto\jdk17"
) do (
    if exist "%%~J\bin\java.exe" (
        set "JAVA_HOME=%%~J"
        set "JAVA_FOUND=1"
        goto :found_java
    )
)

echo ERROR: Java not found in known locations.
echo Please set JAVA_HOME manually before running this script.
echo Example: set JAVA_HOME=C:\Program Files\Java\jdk-17
if not defined NO_PAUSE pause
exit /b 1

:found_java
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Found Java at: %JAVA_HOME%
java -version 2>&1

echo.
echo Setting ANDROID_HOME...
if not defined ANDROID_HOME set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
echo ANDROID_HOME=%ANDROID_HOME%

echo.
echo ============================================
echo  Building Release APK...
echo ============================================
cd /d "%~dp0android"
call "%~dp0android\gradlew.bat" assembleRelease
if errorlevel 1 goto :failed

echo.
echo ============================================
echo  Building Release AAB for Play Store...
echo ============================================
call "%~dp0android\gradlew.bat" bundleRelease
if errorlevel 1 goto :failed

echo.
echo ============================================
echo  Build Complete!
echo ============================================
echo.
echo APK: %~dp0android\app\build\outputs\apk\release\app-release.apk
echo AAB: %~dp0android\app\build\outputs\bundle\release\app-release.aab
echo.
if not defined NO_PAUSE pause
exit /b 0

:failed
echo.
echo ERROR: Gradle build failed - see the output above. No APK/AAB was produced by this run.
if not defined NO_PAUSE pause
exit /b 1
