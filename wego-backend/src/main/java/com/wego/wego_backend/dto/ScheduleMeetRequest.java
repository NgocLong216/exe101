package com.wego.wego_backend.dto;

import lombok.Data;
import lombok.Getter;

import java.time.LocalDateTime;

@Data
@Getter
public class ScheduleMeetRequest {

    private LocalDateTime meetingTime;

    private Double locationLat;

    private Double locationLng;

    private String placeId;
}
