package com.interview.transcription.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class GeminiApiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    @Value("${gemini.model:gemini-pro}")
    private String model;

    @Value("${gemini.timeout-seconds:30}")
    private int timeoutSeconds;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public GeminiApiService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder
                .baseUrl("https://generativelanguage.googleapis.com")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Stream transcription from audio data
     * NOTE: This is a simplified implementation.
     * For production, you would use Gemini's actual speech-to-text streaming API
     */
    public Flux<String> transcribeAudioStream(byte[] audioData, String format) {
        return Mono.fromCallable(() -> {
            log.debug("Processing audio chunk of size: {} bytes, format: {}", audioData.length, format);
            
            // Build request payload
            Map<String, Object> request = buildTranscriptionRequest(audioData, format);
            
            // Call Gemini API
            return webClient.post()
                    .uri("/v1beta/models/gemini-pro:generateContent?key=" + apiKey)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .doOnError(error -> log.error("Error calling Gemini API", error))
                    .block();
        })
        .flatMapMany(response -> processGeminiResponse(response))
        .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Build transcription request for Gemini
     * NOTE: This is a placeholder. Actual implementation would depend on
     * Gemini's specific audio transcription API format
     */
    private Map<String, Object> buildTranscriptionRequest(byte[] audioData, String format) {
        Map<String, Object> request = new HashMap<>();
        
        // Convert audio to base64
        String base64Audio = Base64.encodeBase64String(audioData);
        
        // Build the request structure
        Map<String, Object> content = new HashMap<>();
        Map<String, Object> part = new HashMap<>();
        
        // For actual implementation, use proper Gemini audio API format
        part.put("text", "Please transcribe this audio: " + base64Audio.substring(0, Math.min(100, base64Audio.length())) + "...");
        
        content.put("parts", new Object[]{part});
        request.put("contents", new Object[]{content});
        
        return request;
    }

    /**
     * Process Gemini API response and extract transcription
     */
    private Flux<String> processGeminiResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);
            
            // Navigate through the response structure
            if (root.has("candidates")) {
                JsonNode candidates = root.get("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode firstCandidate = candidates.get(0);
                    if (firstCandidate.has("content")) {
                        JsonNode content = firstCandidate.get("content");
                        if (content.has("parts")) {
                            JsonNode parts = content.get("parts");
                            if (parts.isArray() && parts.size() > 0) {
                                JsonNode firstPart = parts.get(0);
                                if (firstPart.has("text")) {
                                    String text = firstPart.get("text").asText();
                                    log.debug("Extracted transcription: {}", text);
                                    return Flux.just(text);
                                }
                            }
                        }
                    }
                }
            }
            
            log.warn("No transcription found in response");
            return Flux.empty();
            
        } catch (Exception e) {
            log.error("Error processing Gemini response", e);
            return Flux.error(e);
        }
    }

    /**
     * Alternative: Simulate transcription for testing without API key
     * Remove this in production and use actual Gemini API
     */
    public Flux<String> simulateTranscription(byte[] audioData) {
        return Flux.interval(Duration.ofMillis(500))
                .take(3)
                .map(i -> {
                    if (i == 0) return "Hello";
                    if (i == 1) return "this is";
                    return "a test transcription";
                });
    }
}
