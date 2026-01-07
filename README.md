Pre-Interview Assignment: Fullstack Development

Submission Date: January 7, 2026

Quick Start

Frontend

cd frontend
# open index.html in browser


Or (recommended):

python -m http.server 8000


Open http://localhost:8000

Steps: Click Start Microphone, allow microphone permission, click Enable Transcription, speak to see live visualization and text.

Backend

cd backend
mvn clean install
java -jar target/streaming-transcription-1.0.0.jar


Backend runs on http://localhost:8080

Features

Frontend

Circular audio visualizer using Web Audio API and Canvas

Smooth animation (~60 FPS)

Real-time frequency and volume response

Responsive UI

Live transcription (browser-based)

Backend

Spring Boot with WebFlux

WebSocket-based streaming

Low-latency, non-blocking design

Ready for integration with external speech APIs

UI/UX Audit

Review of PrepXL.app

Improvement suggestions and design notes

Documentation: documentation/UI-UX-Audit-Report.md

Notes

Transcription currently uses the browser’s Web Speech API. Backend streaming is implemented and can be connected to any real-time speech-to-text service.

Project Structure
Assignment/
├── frontend/        Audio visualizer UI
├── backend/         Spring Boot streaming service
├── documentation/   UI/UX audit report
├── README.md
└── TECHNICAL_NOTES.md

Tech Stack

Frontend: HTML, CSS, JavaScript, Web Audio API, Canvas
Backend: Java 17, Spring Boot, WebFlux, WebSocket
Architecture: Reactive, low-latency streaming

This project demonstrates real-time audio processing, frontend-backend integration, and basic UI/UX analysis as part of the pre-interview assignment.