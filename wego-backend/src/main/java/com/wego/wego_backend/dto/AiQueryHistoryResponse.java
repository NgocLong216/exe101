package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
public class AiQueryHistoryResponse {

    private UUID id;

    private UUID groupId;

    private String senderFirebaseUid;

    private String senderName;

    private String prompt;

    private LocalDateTime createdAt;
}