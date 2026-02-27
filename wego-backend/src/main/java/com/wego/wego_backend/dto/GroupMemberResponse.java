package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GroupMemberResponse {
    private String firebaseUid;
    private String name;
    private boolean isHost;
}

