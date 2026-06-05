package com.wego.wego_backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AiChecklistResponse(
        UUID id,
        String content,
        LocalDateTime createdAt
) {
}