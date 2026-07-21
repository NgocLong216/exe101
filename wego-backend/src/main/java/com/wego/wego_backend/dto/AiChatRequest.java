package com.wego.wego_backend.dto;

import lombok.Data;

import java.util.Map;

@Data
public class AiChatRequest {

    private String sessionId;

    private String userId;

    private Map<String, Object> userProfile;

    private String message;
}
