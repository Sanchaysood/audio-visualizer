package com.interview.transcription.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioMessage {
    private String type;
    private String data;
    private long timestamp;
    private String format;
}
