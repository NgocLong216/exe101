package com.wego.wego_backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SuggestPlaceRequest {
    private String keyword; // "cafe", "restaurant", ...
}

