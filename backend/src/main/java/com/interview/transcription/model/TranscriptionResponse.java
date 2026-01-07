package com.interview.transcription.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TranscriptionResponse {
    private String type;
    private String text;
    private Boolean isFinal;
    private Double confidence;
    private Long timestamp;
    private String message;
}
