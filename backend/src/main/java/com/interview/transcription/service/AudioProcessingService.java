package com.interview.transcription.service;

import com.interview.transcription.model.AudioMessage;
import com.interview.transcription.model.TranscriptionResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class AudioProcessingService {

    private final GeminiApiService geminiApiService;
    
    @Value("${audio.chunk.max-size-mb:10}")
    private int maxChunkSizeMb;
    
    @Value("${gemini.api.key}")
    private String geminiApiKey;
    
    // Store audio streams per session
    private final Map<String, Sinks.Many<byte[]>> audioStreams = new ConcurrentHashMap<>();

    public AudioProcessingService(GeminiApiService geminiApiService) {
        this.geminiApiService = geminiApiService;
    }

    /**
     * Process audio message and stream transcription
     */
    public Flux<TranscriptionResponse> processAudioChunk(String sessionId, AudioMessage audioMessage) {
        try {
            log.debug("Processing audio chunk for session: {}", sessionId);
            
            // Decode base64 audio data
            byte[] audioData = Base64.decodeBase64(audioMessage.getData());
            
            // Validate chunk size
            if (audioData.length > maxChunkSizeMb * 1024 * 1024) {
                return Flux.just(TranscriptionResponse.builder()
                        .type("error")
                        .message("Audio chunk too large")
                        .timestamp(System.currentTimeMillis())
                        .build());
            }
            
            // Forward to Gemini API immediately (no buffering)
            return forwardToGemini(audioData, audioMessage.getFormat())
                    .map(text -> TranscriptionResponse.builder()
                            .type("transcription")
                            .text(text)
                            .isFinal(true)
                            .confidence(0.95)
                            .timestamp(System.currentTimeMillis())
                            .build())
                    .onErrorResume(error -> {
                        log.error("Error transcribing audio", error);
                        return Flux.just(TranscriptionResponse.builder()
                                .type("error")
                                .message("Transcription failed: " + error.getMessage())
                                .timestamp(System.currentTimeMillis())
                                .build());
                    })
                    .subscribeOn(Schedulers.boundedElastic());
                    
        } catch (Exception e) {
            log.error("Error processing audio chunk", e);
            return Flux.just(TranscriptionResponse.builder()
                    .type("error")
                    .message("Failed to process audio: " + e.getMessage())
                    .timestamp(System.currentTimeMillis())
                    .build());
        }
    }

    /**
     * Forward audio to Gemini API for transcription
     */
    private Flux<String> forwardToGemini(byte[] audioData, String format) {
        // Check if API key is configured
        if (geminiApiKey == null || geminiApiKey.equals("your-api-key-here")) {
            log.warn("Gemini API key not configured, using simulation mode");
            return geminiApiService.simulateTranscription(audioData);
        }
        
        // Use actual Gemini API
        return geminiApiService.transcribeAudioStream(audioData, format);
    }

    /**
     * Create a new audio stream for a session
     */
    public void createAudioStream(String sessionId) {
        Sinks.Many<byte[]> sink = Sinks.many().multicast().onBackpressureBuffer();
        audioStreams.put(sessionId, sink);
        log.info("Created audio stream for session: {}", sessionId);
    }

    /**
     * Close audio stream for a session
     */
    public void closeAudioStream(String sessionId) {
        Sinks.Many<byte[]> sink = audioStreams.remove(sessionId);
        if (sink != null) {
            sink.tryEmitComplete();
            log.info("Closed audio stream for session: {}", sessionId);
        }
    }

    /**
     * Get active session count
     */
    public int getActiveSessionCount() {
        return audioStreams.size();
    }
}
