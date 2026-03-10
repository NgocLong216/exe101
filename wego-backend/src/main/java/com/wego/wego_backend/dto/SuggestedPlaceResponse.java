package com.wego.wego_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@AllArgsConstructor
public class SuggestedPlaceResponse {

    private CenterPoint center;
    private List<PlaceDto> places;

    @Getter
    @AllArgsConstructor
    public static class CenterPoint {
        private double lat;
        private double lng;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    public static class PlaceDto {
        private String placeId;
        private String name;
        private double lat;
        private double lng;
        private double rating;
        private long travelTime;
        private String thumbnail;
    }
}