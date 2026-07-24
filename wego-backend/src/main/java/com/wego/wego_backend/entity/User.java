package com.wego.wego_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "firebase_uid", nullable = false, unique = true)
    private String firebaseUid;

    private String email;
    private String name;
    private String avatar;

    @Column(name = "fcm_token")
    private String fcmToken;

    private String expoPushToken;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    private LocalDateTime createdAt;

    @Column(nullable = false)
    private Boolean notificationsEnabled = true;

    @Column(nullable = false)
    private Boolean locationSharingEnabled = true;

    @Column
    private String plan = "FREE";

    private LocalDateTime planExpiresAt;

    // Database default keeps existing users onboarded during schema migration;
    // newly constructed User objects still start at false.
    @Column(nullable = false, columnDefinition = "boolean default true")
    private Boolean hobbyOnboardingCompleted = false;

    @Column(columnDefinition = "TEXT")
    private String hobbyPreferencesJson;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private Boolean status = true;
}
