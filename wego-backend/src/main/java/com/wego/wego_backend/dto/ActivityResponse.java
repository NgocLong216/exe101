package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ActivityResponse {

    private String type;
    private String message;
    private LocalDateTime createdAt;
}