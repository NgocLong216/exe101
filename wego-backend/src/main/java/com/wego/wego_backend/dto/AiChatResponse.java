package com.wego.wego_backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class AiChatResponse {

    private String status;

    private String message;

    private List<SuggestedPlaceResponse.PlaceDto> places;
}