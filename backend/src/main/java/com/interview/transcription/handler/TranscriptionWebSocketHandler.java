package com.interview.transcription.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.interview.transcription.model.AudioMessage;
import com.interview.transcription.model.TranscriptionResponse;
import com.interview.transcription.service.AudioProcessingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.WebSocketMessage;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class TranscriptionWebSocketHandler implements WebSocketHandler {

    private final AudioProcessingService audioProcessingService;
    private final ObjectMapper objectMapper;
    private final Map<String, Sinks.Many<String>> activeSessions = new ConcurrentHashMap<>();

    public TranscriptionWebSocketHandler(AudioProcessingService audioProcessingService, 
                                        ObjectMapper objectMapper) {
        this.audioProcessingService = audioProcessingService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String sessionId = session.getId();
        
        // Create a sink for sending messages to the client
        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
        activeSessions.put(sessionId, sink);
        audioProcessingService.createAudioStream(sessionId);
        
        log.info("WebSocket connection established: {} (Total: {})", 
                sessionId, activeSessions.size());
        
        // Send welcome message
        TranscriptionResponse welcome = TranscriptionResponse.builder()
                .type("info")
                .message("Connected to transcription service")
                .timestamp(System.currentTimeMillis())
                .build();
        
        try {
            sink.tryEmitNext(objectMapper.writeValueAsString(welcome));
        } catch (Exception e) {
            log.error("Error sending welcome message", e);
        }
        
        // Handle incoming messages
        Mono<Void> input = session.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .flatMap(payload -> {
                    try {
                        AudioMessage audioMessage = objectMapper.readValue(payload, AudioMessage.class);
                        
                        if ("audio".equals(audioMessage.getType())) {
                            return audioProcessingService.processAudioChunk(sessionId, audioMessage)
                                    .doOnNext(response -> {
                                        try {
                                            String json = objectMapper.writeValueAsString(response);
                                            sink.tryEmitNext(json);
                                        } catch (Exception e) {
                                            log.error("Error sending transcription response", e);
                                        }
                                    })
                                    .doOnError(error -> {
                                        log.error("Error processing audio stream", error);
                                        sendErrorMessage(sink, "Processing error: " + error.getMessage());
                                    })
                                    .then();
                        }
                    } catch (Exception e) {
                        log.error("Error handling message", e);
                        sendErrorMessage(sink, "Invalid message format");
                    }
                    return Mono.empty();
                })
                .then();
        
        // Send outgoing messages
        Mono<Void> output = session.send(
                sink.asFlux()
                    .map(session::textMessage)
        );
        
        // Handle both input and output streams
        return Mono.zip(input, output)
                .doFinally(signalType -> {
                    activeSessions.remove(sessionId);
                    audioProcessingService.closeAudioStream(sessionId);
                    log.info("WebSocket connection closed: {} (Remaining: {})", 
                            sessionId, activeSessions.size());
                })
                .then();
    }

    /**
     * Send error message to client
     */
    private void sendErrorMessage(Sinks.Many<String> sink, String errorMessage) {
        TranscriptionResponse error = TranscriptionResponse.builder()
                .type("error")
                .message(errorMessage)
                .timestamp(System.currentTimeMillis())
                .build();
        
        try {
            String json = objectMapper.writeValueAsString(error);
            sink.tryEmitNext(json);
        } catch (Exception e) {
            log.error("Error sending error message", e);
        }
    }

    /**
     * Get count of active sessions
     */
    public int getActiveSessionCount() {
        return activeSessions.size();
    }
}
