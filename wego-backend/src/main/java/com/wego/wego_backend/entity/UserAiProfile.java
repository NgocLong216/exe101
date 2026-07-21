package com.wego.wego_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_ai_profiles")
@Getter
@Setter
@NoArgsConstructor
public class UserAiProfile {

    @Id
    @Column(name = "firebase_uid", nullable = false, length = 128)
    private String firebaseUid;

    @Column(name = "profile_json", nullable = false, columnDefinition = "TEXT")
    private String profileJson;

    @Column(name = "source_message_count", nullable = false)
    private Integer sourceMessageCount = 0;

    @Column(name = "source_last_timestamp", nullable = false)
    private Long sourceLastTimestamp = 0L;

    @Column(name = "synced_at", nullable = false)
    private LocalDateTime syncedAt;
}
