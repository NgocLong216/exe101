package com.wego.wego_backend.dto;

import com.wego.wego_backend.constant.GroupStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
public class MeetingScheduleResponse {

    private UUID groupId;

    private String groupTitle;

    private String description;

    private LocalDateTime meetingTime;

    private Double lat;
    private Double lng;

    private String placeId;

    private String groupPhoto;

    private Integer attendeeCount;

    private List<String> attendeePhotos;

    private GroupStatus status;

    private boolean isHost;
}
