package com.interview.transcription.controller;

import com.interview.transcription.handler.TranscriptionWebSocketHandler;
import com.interview.transcription.service.AudioProcessingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
public class HealthController {

    private final AudioProcessingService audioProcessingService;
    private final TranscriptionWebSocketHandler webSocketHandler;

    public HealthController(AudioProcessingService audioProcessingService,
                           TranscriptionWebSocketHandler webSocketHandler) {
        this.audioProcessingService = audioProcessingService;
        this.webSocketHandler = webSocketHandler;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "streaming-transcription");
        health.put("timestamp", System.currentTimeMillis());
        health.put("activeSessions", webSocketHandler.getActiveSessionCount());
        
        return ResponseEntity.ok(health);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> status = new HashMap<>();
        status.put("activeWebSocketSessions", webSocketHandler.getActiveSessionCount());
        status.put("activeAudioStreams", audioProcessingService.getActiveSessionCount());
        status.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.ok(status);
    }
}
