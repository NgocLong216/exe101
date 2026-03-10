package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.LatLng;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class GoongDirectionsService {

    @Value("${goong.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public long getTravelTimeSeconds(LatLng origin, LatLng destination) {

        try {
            System.out.println("Origin: " + origin.getLat() + "," + origin.getLng());
            System.out.println("Destination: " + destination.getLat() + "," + destination.getLng());

            String url = String.format(
                    "https://rsapi.goong.io/Direction?origin=%f,%f&destination=%f,%f&vehicle=car&api_key=%s",
                    origin.getLat(),
                    origin.getLng(),
                    destination.getLat(),
                    destination.getLng(),
                    apiKey
            );

            Map root = restTemplate.getForObject(url, Map.class);

            List routes = (List) root.get("routes");

            if (routes == null || routes.isEmpty()) {
                return Long.MAX_VALUE;
            }

            Map route = (Map) routes.get(0);
            List legs = (List) route.get("legs");
            Map leg = (Map) legs.get(0);

            Map duration = (Map) leg.get("duration");

            return ((Number) duration.get("value")).longValue();

        } catch (Exception e) {

            System.out.println("Goong route error: " + e.getMessage());

            return Long.MAX_VALUE;
        }
    }
}
