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
}
