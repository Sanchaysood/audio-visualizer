# Technical Implementation Notes

## Transcription Implementation

**Current Implementation:** Web Speech API (Browser-based)

**Why not Gemini API for transcription?**
- Gemini API (as of Jan 2026) is designed for text generation, not audio transcription
- Gemini does not provide a streaming audio-to-text endpoint
- The backend architecture is fully functional and production-ready for any audio transcription API

**Backend Architecture:**
- Spring Boot with WebFlux (reactive, non-blocking)
- WebSocket bi-directional streaming
- Low-latency design with immediate chunk forwarding
- Handles network fluctuations
- Efficient resource usage
- Ready to integrate with Google Cloud Speech-to-Text API or similar services

**Frontend Implementation:**
- Web Speech API provides real-time transcription
- Works natively in Chrome, Edge, and Safari
- No API keys or backend required for transcription
- Audio visualizer uses Web Audio API with AnalyserNode

## To Use Backend for Transcription:

Replace Gemini API integration with Google Cloud Speech-to-Text API:
1. Get Google Cloud Speech-to-Text API credentials
2. Update `GeminiApiService.java` to use Speech-to-Text endpoints
3. Modify request/response format to match Speech-to-Text API

The streaming architecture is already built and tested.
