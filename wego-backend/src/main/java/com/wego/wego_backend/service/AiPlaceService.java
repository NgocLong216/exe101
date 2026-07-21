package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.AiChatRequest;
import com.wego.wego_backend.dto.AiChatResponse;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiPlaceService {

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final UserAiProfileService userAiProfileService;

    @Value("${ai.service.free-url:${ai.service.url}}")
    private String freeAiServiceUrl;

    @Value("${ai.service.premium-url:http://127.0.0.1:8001}")
    private String premiumAiServiceUrl;

    public AiChatResponse chat(
            String sessionId,
            String message,
            String firebaseUid
    ) {

        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean premium = hasActivePremiumPlan(user);
        String serviceUrl = premium ? premiumAiServiceUrl : freeAiServiceUrl;
        String url = serviceUrl + "/chat";

        AiChatRequest request =
                new AiChatRequest();

        request.setSessionId(sessionId);
        request.setUserId(firebaseUid);
        if (premium) {
            request.setUserProfile(
                    userAiProfileService.syncFromPersonalChats(firebaseUid)
            );
        }
        request.setMessage(message);

        return restTemplate.postForObject(
                url,
                request,
                AiChatResponse.class
        );
    }

    private boolean hasActivePremiumPlan(User user) {
        String plan = user.getPlan();
        if (!("PLUS".equalsIgnoreCase(plan) || "PREMIUM".equalsIgnoreCase(plan))) {
            return false;
        }

        LocalDateTime expiresAt = user.getPlanExpiresAt();
        return expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
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
