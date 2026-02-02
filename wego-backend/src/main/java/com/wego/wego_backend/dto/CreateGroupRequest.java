package com.wego.wego_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class CreateGroupRequest {

    @NotBlank
    private String title;

    private String description;

    private LocalDateTime meetingTime;

    private Double lat;
    private Double lng;
    private String placeId;

    private List<String> memberFirebaseUids;
}

