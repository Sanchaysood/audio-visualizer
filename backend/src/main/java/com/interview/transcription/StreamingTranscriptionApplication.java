package com.interview.transcription;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class StreamingTranscriptionApplication {

    public static void main(String[] args) {
        SpringApplication.run(StreamingTranscriptionApplication.class, args);
        System.out.println("=================================================");
        System.out.println("🎙️  Streaming Transcription Service Started");
        System.out.println("=================================================");
        System.out.println("WebSocket Endpoint: ws://localhost:8080/transcribe");
        System.out.println("Health Check: http://localhost:8080/actuator/health");
        System.out.println("=================================================");
    }
}
