package com.wego.wego_backend.dto;

import com.wego.wego_backend.constant.GroupStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class MyGroupResponse {

    private UUID id;
    private String title;
    private String description;
    private Double locationLat;
    private Double locationLng;
    private LocalDateTime meetingTime;
    private GroupStatus status;
    private int memberCount;
    private boolean isHost;
    private String groupPhoto;
}

