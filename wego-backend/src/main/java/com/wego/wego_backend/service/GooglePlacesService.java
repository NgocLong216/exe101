package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.LatLng;
import com.wego.wego_backend.dto.SuggestedPlaceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GooglePlacesService {

    @Value("${google.map.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public List<SuggestedPlaceResponse.PlaceDto> searchNearby(
            LatLng center,
            String keyword
    ) {

        String url = String.format(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json" +
                        "?location=%f,%f&radius=1500&keyword=%s&key=%s",
                center.getLat(),
                center.getLng(),
                keyword,
                apiKey
        );

        Map<String, Object> root =
                restTemplate.getForObject(url, Map.class);

        List<SuggestedPlaceResponse.PlaceDto> places = new ArrayList<>();

        if (root == null) return places;

        List<Map<String, Object>> results =
                (List<Map<String, Object>>) root.get("results");

        if (results == null) return places;

        for (Map<String, Object> p : results) {

            Map<String, Object> geometry =
                    (Map<String, Object>) p.get("geometry");
            Map<String, Object> location =
                    (Map<String, Object>) geometry.get("location");

            places.add(
                    new SuggestedPlaceResponse.PlaceDto(
                            (String) p.get("place_id"),
                            (String) p.get("name"),
                            ((Number) location.get("lat")).doubleValue(),
                            ((Number) location.get("lng")).doubleValue(),
                            p.get("rating") != null
                                    ? ((Number) p.get("rating")).doubleValue()
                                    : 0.0
                    )
            );
        }

        return places;
    }
}
