package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.LatLng;
import com.wego.wego_backend.dto.SuggestedPlaceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SerpApiPlacesService {

    @Value("${serp.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public List<SuggestedPlaceResponse.PlaceDto> searchNearby(
            LatLng center,
            String keyword
    ) {

        String encodedKeyword =
                URLEncoder.encode(keyword, StandardCharsets.UTF_8);

        String ll = String.format("@%f,%f,14z",
                center.getLat(),
                center.getLng()
        );

        String url = String.format(
                "https://serpapi.com/search.json" +
                        "?engine=google_maps" +
                        "&type=search" +
                        "&q=%s" +
                        "&ll=%s" +
                        "&hl=vi" +
                        "&num=20" +
                        "&api_key=%s",
                URLEncoder.encode(keyword + " near me", StandardCharsets.UTF_8),
                ll,
                apiKey
        );

        Map<String, Object> root =
                restTemplate.getForObject(url, Map.class);

        List<SuggestedPlaceResponse.PlaceDto> places = new ArrayList<>();

        if (root == null) return places;

        List<Map<String, Object>> results =
                (List<Map<String, Object>>) root.get("local_results");

        if (results == null) return places;

        for (Map<String, Object> p : results) {

            Map<String, Object> gps =
                    (Map<String, Object>) p.get("gps_coordinates");

            if (gps == null) continue;

            double lat = ((Number) gps.get("latitude")).doubleValue();
            double lng = ((Number) gps.get("longitude")).doubleValue();

            double distance = distanceKm(
                    center.getLat(),
                    center.getLng(),
                    lat,
                    lng
            );

            String thumbnail = (String) p.get("thumbnail");

            System.out.println("Place: " + p.get("title"));
            System.out.println("Distance: " + distance);
            if (distance > 15) continue;

            places.add(
                    new SuggestedPlaceResponse.PlaceDto(
                            (String) p.get("place_id"),
                            (String) p.get("title"),
                            lat,
                            lng,
                            p.get("rating") != null
                                    ? ((Number) p.get("rating")).doubleValue()
                                    : 0.0,
                            0,
                            thumbnail
                    )
            );
        }

        System.out.println("Total places: " + places.size());
        return places.stream().limit(5).toList();
    }

    private double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a =
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(Math.toRadians(lat1)) *
                                Math.cos(Math.toRadians(lat2)) *
                                Math.sin(dLon/2) *
                                Math.sin(dLon/2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }
}
