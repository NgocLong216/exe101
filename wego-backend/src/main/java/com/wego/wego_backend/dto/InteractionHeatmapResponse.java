package com.wego.wego_backend.dto;

public record InteractionHeatmapResponse(
        int dayOfWeek,
        int timeSlot,
        long count
) {
}
