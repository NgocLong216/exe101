package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.AiChatRequest;
import com.wego.wego_backend.dto.AiChatResponse;
import com.wego.wego_backend.service.AiPlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/personal")
@RequiredArgsConstructor
public class PersonalAiController {

    private final AiPlaceService aiPlaceService;

    @PostMapping("/chat")
    public AiChatResponse chat(
            @RequestBody AiChatRequest request,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        return aiPlaceService.chat(
                "personal:" + firebaseUid,
                request.getMessage(),
                firebaseUid
        );
    }
}
