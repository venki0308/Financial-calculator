@echo off
echo ============================================
echo  FinCalix Release Builder
echo ============================================

:: Try to find Java from known locations
set JAVA_FOUND=0

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
        set JAVA_HOME=%%~J
        set PATH=%%~J\bin;%PATH%
        set JAVA_FOUND=1
        echo Found Java at: %%~J
        goto :found_java
    )
)

echo ERROR: Java not found in known locations.
echo Please set JAVA_HOME manually before running this script.
echo Example: set JAVA_HOME=C:\Program Files\Java\jdk-17
pause
exit /b 1

:found_java
echo Using JAVA_HOME: %JAVA_HOME%
java -version 2>&1

echo.
echo Setting ANDROID_HOME...
set ANDROID_HOME=C:\Users\venki\AppData\Local\Android\Sdk
echo ANDROID_HOME=%ANDROID_HOME%

echo.
echo ============================================
echo  Building Release APK...
echo ============================================
cd /d D:\Skills\Financial-calculator\android
call gradlew.bat assembleRelease

echo.
echo ============================================
echo  Building Release AAB (for Play Store)...
echo ============================================
call gradlew.bat bundleRelease

echo.
echo ============================================
echo  Build Complete!
echo ============================================
echo.
echo APK: D:\Skills\Financial-calculator\android\app\build\outputs\apk\release\app-release.apk
echo AAB: D:\Skills\Financial-calculator\android\app\build\outputs\bundle\release\app-release.aab
echo.
pause
