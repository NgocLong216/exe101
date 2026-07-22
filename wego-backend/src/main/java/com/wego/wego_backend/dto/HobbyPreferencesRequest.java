package com.wego.wego_backend.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class HobbyPreferencesRequest {
    private List<String> destinations = new ArrayList<>();
    private List<String> vibes = new ArrayList<>();
}
