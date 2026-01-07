@echo off
echo ================================================
echo Starting Streaming Transcription Service
echo ================================================
echo.
echo Make sure you have set the GEMINI_API_KEY environment variable:
echo   set GEMINI_API_KEY=your-api-key-here
echo.
echo Or edit application.properties to add your API key.
echo.
echo ================================================

call mvn spring-boot:run
