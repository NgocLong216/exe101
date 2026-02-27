package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.LatLng;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
public class GoogleDirectionsService {

    @Value("${google.map.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public long getTravelTimeSeconds(LatLng origin, LatLng destination) {

        String url = String.format(
                "https://maps.googleapis.com/maps/api/directions/json" +
                        "?origin=%f,%f&destination=%f,%f&key=%s",
                origin.getLat(), origin.getLng(),
                destination.getLat(), destination.getLng(),
                apiKey
        );

        JsonNode root = restTemplate.getForObject(url, JsonNode.class);

        if (root == null || root.path("routes").isEmpty()) {
            throw new RuntimeException("No route found");
        }

        return root
                .path("routes").get(0)
                .path("legs").get(0)
                .path("duration")
                .path("value")
                .asLong();
    }
}
