package com.wego.wego_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_query_history")
@Getter
@Setter
public class AiQueryHistory {

    @Id
    @GeneratedValue
    private UUID id;

    private UUID groupId;

    private String senderFirebaseUid;

    @Column(columnDefinition = "TEXT")
    private String prompt;

    private LocalDateTime createdAt;
}