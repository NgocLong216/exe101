package com.wego.wego_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "schedule_history")
@Getter
@Setter
public class ScheduleHistory {

    @Id
    @GeneratedValue
    private UUID id;

    private UUID groupId;

    private String hostFirebaseUid;

    private String groupTitle;

    private LocalDateTime meetingTime;

    private LocalDateTime createdAt;
}