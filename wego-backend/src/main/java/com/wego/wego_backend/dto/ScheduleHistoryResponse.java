package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
public class ScheduleHistoryResponse {

    private UUID id;

    private UUID groupId;

    private String groupTitle;

    private String hostFirebaseUid;

    private String hostName;

    private LocalDateTime meetingTime;

    private LocalDateTime createdAt;
}