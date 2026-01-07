@echo off
echo ================================================
echo Building Streaming Transcription Service
echo ================================================

if not exist target mkdir target

echo Cleaning previous builds...
call mvn clean

echo Building application...
call mvn package -DskipTests

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo Build Successful!
    echo ================================================
    echo JAR file: target\streaming-transcription-1.0.0.jar
    echo.
    echo To run the application:
    echo   java -jar target\streaming-transcription-1.0.0.jar
    echo.
    echo Or use:
    echo   mvn spring-boot:run
    echo ================================================
) else (
    echo.
    echo ================================================
    echo Build Failed!
    echo ================================================
    echo Please check the error messages above.
    echo ================================================
)

pause
