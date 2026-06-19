package com.wego.wego_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExpoNotificationService {

    private final RestTemplate restTemplate;

    public void send(
            String token,
            String title,
            String body
    ){

        String url =
                "https://exp.host/--/api/v2/push/send";

        Map<String,Object> payload =
                new HashMap<>();

        payload.put("to", token);

        payload.put("title", title);

        payload.put("body", body);

        payload.put("sound", "default");

        HttpHeaders headers =
                new HttpHeaders();

        headers.setContentType(
                MediaType.APPLICATION_JSON
        );

        HttpEntity<?> entity =
                new HttpEntity<>(
                        payload,
                        headers
                );

        restTemplate.postForEntity(
                url,
                entity,
                String.class
        );

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        url,
                        entity,
                        String.class
                );

        System.out.println(
                "EXPO RESPONSE: "
                        + response.getBody()
        );
    }
}
