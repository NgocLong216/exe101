package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.LatLng;
import com.wego.wego_backend.dto.SuggestedPlaceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

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

        try {

            String ll = String.format(Locale.US, "@%f,%f,14z",
                    center.getLat(),
                    center.getLng()
            );

            String url = String.format(
                    "https://serpapi.com/search.json" +
                            "?engine=google_maps" +
                            "&q=%s" +
                            "&ll=%s" +
                            "&api_key=%s",
                    URLEncoder.encode(keyword, StandardCharsets.UTF_8),
                    ll,
                    apiKey
            );

            System.out.println("CALL API: " + url);

            Map<String, Object> root =
                    restTemplate.getForObject(url, Map.class);

            if (root == null) return List.of();

            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) root.get("local_results");

            if (results == null) {
                Map<String, Object> single =
                        (Map<String, Object>) root.get("place_results");

                if (single != null) {
                    results = List.of(single);
                }
            }

            if (results == null) return List.of();

            List<SuggestedPlaceResponse.PlaceDto> places = new ArrayList<>();

            for (Map<String, Object> p : results) {

                Map<String, Object> gps =
                        (Map<String, Object>) p.get("gps_coordinates");

                if (gps == null) continue;

                double lat = ((Number) gps.get("latitude")).doubleValue();
                double lng = ((Number) gps.get("longitude")).doubleValue();

                String name = (String) p.getOrDefault("title", "Unknown");

                System.out.println("PLACE: " + name + " | " + lat + "," + lng);

                double rating = p.get("rating") != null
                        ? ((Number) p.get("rating")).doubleValue()
                        : 0.0;

                String thumbnail = (String) p.get("thumbnail");

                places.add(
                        new SuggestedPlaceResponse.PlaceDto(
                                (String) p.getOrDefault("place_id", UUID.randomUUID().toString()),
                                name,
                                lat,
                                lng,
                                rating,
                                0,
                                thumbnail
                        )
                );
            }

            return places;

        } catch (Exception e) {
            System.out.println("SerpApi error: " + e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getPlaceDetail(String placeId) {

        try {
            String url = String.format(
                    "https://serpapi.com/search.json" +
                            "?engine=google_maps" +
                            "&place_id=%s" +
                            "&api_key=%s",
                    placeId,
                    apiKey
            );

            Map<String, Object> root =
                    restTemplate.getForObject(url, Map.class);

            if (root == null) return Map.of();

            Map<String, Object> place =
                    (Map<String, Object>) root.get("place_results");

            if (place == null) return Map.of();

            Map<String, Object> result = new HashMap<>();

            // basic
            result.put("name", place.get("title"));
            result.put("address", place.get("address"));
            result.put("phone", place.get("phone"));
            result.put("rating", place.get("rating"));
            result.put("reviews", place.get("reviews"));
            result.put("website", place.get("website"));
            result.put("description", place.get("description"));
            result.put("hours", place.get("hours"));

            // NEW
            result.put("place_id", place.get("place_id"));
            result.put("data_id", place.get("data_id"));
            result.put("thumbnail", place.get("thumbnail"));
            result.put("open_state", place.get("open_state"));
            result.put("types", place.get("type"));
            result.put("service_options", place.get("service_options"));
            result.put("rating_summary", place.get("rating_summary"));

            // gps
            Map<String, Object> gps =
                    (Map<String, Object>) place.get("gps_coordinates");
            if (gps != null) {
                result.put("lat", gps.get("latitude"));
                result.put("lng", gps.get("longitude"));
            }

            // links
            result.put("reviews_link", place.get("reviews_link"));
            result.put("photos_link", place.get("photos_link"));

            // user reviews preview
            Map<String, Object> userReviews =
                    (Map<String, Object>) place.get("user_reviews");
            if (userReviews != null) {
                result.put("top_reviews",
                        userReviews.get("most_relevant"));
            }

            return result;

        } catch (Exception e) {
            System.out.println("Detail error: " + e.getMessage());
            return Map.of();
        }
    }
}