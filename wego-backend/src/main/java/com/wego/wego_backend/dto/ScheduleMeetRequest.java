package com.wego.wego_backend.dto;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ScheduleMeetRequest {
    private LocalDateTime meetingTime;
}
