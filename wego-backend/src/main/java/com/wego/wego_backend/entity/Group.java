package com.wego.wego_backend.entity;

import com.wego.wego_backend.constant.GroupStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "groups")
@Getter
@Setter
public class Group {

    @Id
    @GeneratedValue
    private UUID id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime meetingTime;

    private Double locationLat;
    private Double locationLng;
    private String placeId;

    @Column(name = "host_id")
    private String hostFirebaseUid;

    @Enumerated(EnumType.STRING)
    private GroupStatus status;

    private Boolean meetNotificationSent = false;

    private LocalDateTime createdAt;
}

