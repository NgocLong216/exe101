package com.wego.wego_backend.dto;

import lombok.Data;

@Data
public class AiChatRequest {

    private String sessionId;

    private String message;
}
