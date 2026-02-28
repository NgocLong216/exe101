package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserProfileResponse {

    private String firebaseUid;
    private String name;
    private String email;
    private String avatar;
}