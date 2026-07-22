package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class UserProfileResponse {

    private String firebaseUid;
    private String name;
    private String email;
    private String avatar;
    private String plan;
    private LocalDateTime planExpiresAt;
}
