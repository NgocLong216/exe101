package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.AiChatRequest;
import com.wego.wego_backend.dto.AiChatResponse;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiPlaceServiceTest {

    private RestTemplate restTemplate;
    private UserRepository userRepository;
    private UserAiProfileService userAiProfileService;
    private AiPlaceService service;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        userRepository = mock(UserRepository.class);
        userAiProfileService = mock(UserAiProfileService.class);
        service = new AiPlaceService(
                restTemplate,
                userRepository,
                userAiProfileService
        );
        ReflectionTestUtils.setField(service, "freeAiServiceUrl", "http://free-ai");
        ReflectionTestUtils.setField(service, "premiumAiServiceUrl", "http://premium-ai");
    }

    @Test
    void freeUserUsesFreeChatbot() {
        assertChatbotUrl("FREE", null, "http://free-ai/chat");
    }

    @Test
    void activePlusUserUsesPremiumChatbotAndSendsUserId() {
        assertChatbotUrl(
                "PLUS",
                LocalDateTime.now().plusDays(1),
                "http://premium-ai/chat"
        );
    }

    @Test
    void expiredPlusUserFallsBackToFreeChatbot() {
        assertChatbotUrl(
                "PLUS",
                LocalDateTime.now().minusSeconds(1),
                "http://free-ai/chat"
        );
    }

    private void assertChatbotUrl(
            String plan,
            LocalDateTime expiresAt,
            String expectedUrl
    ) {
        User user = new User();
        user.setFirebaseUid("firebase-user-1");
        user.setPlan(plan);
        user.setPlanExpiresAt(expiresAt);

        when(userRepository.findByFirebaseUid("firebase-user-1"))
                .thenReturn(Optional.of(user));
        when(userAiProfileService.syncFromPersonalChats("firebase-user-1"))
                .thenReturn(Map.of("tags", java.util.List.of("cafe")));
        when(restTemplate.postForObject(
                eq(expectedUrl),
                org.mockito.ArgumentMatchers.any(AiChatRequest.class),
                eq(AiChatResponse.class)
        )).thenReturn(new AiChatResponse());

        service.chat("group-1", "Tìm quán cà phê", "firebase-user-1");

        ArgumentCaptor<AiChatRequest> requestCaptor =
                ArgumentCaptor.forClass(AiChatRequest.class);
        verify(restTemplate).postForObject(
                eq(expectedUrl),
                requestCaptor.capture(),
                eq(AiChatResponse.class)
        );

        assertEquals("group-1", requestCaptor.getValue().getSessionId());
        assertEquals("firebase-user-1", requestCaptor.getValue().getUserId());
        assertEquals("Tìm quán cà phê", requestCaptor.getValue().getMessage());
    }
}
