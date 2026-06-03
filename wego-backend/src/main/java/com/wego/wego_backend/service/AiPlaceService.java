package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.AiChatRequest;
import com.wego.wego_backend.dto.AiChatResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiPlaceService {

    private final RestTemplate restTemplate = new RestTemplate();

    public AiChatResponse chat(
            String sessionId,
            String message
    ) {

        String url = "http://localhost:8000/chat";

        AiChatRequest request =
                new AiChatRequest();

        request.setSessionId(sessionId);
        request.setMessage(message);

        System.out.print(sessionId);
        System.out.print(message);

        return restTemplate.postForObject(
                url,
                request,
                AiChatResponse.class
        );
    }

    public Map<String, Object> search(String query) {

        String url = "http://localhost:8000/ai/search";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = Map.of(
                "query",
                query
        );

        HttpEntity<Map<String, String>> request =
                new HttpEntity<>(body, headers);

        ResponseEntity<Map> response =
                restTemplate.postForEntity(
                        url,
                        request,
                        Map.class
                );

        return response.getBody();
    }
}