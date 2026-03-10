package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.UpdateProfileRequest;
import com.wego.wego_backend.repository.UserRepository;
import com.wego.wego_backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam String keyword
    ) {
        return ResponseEntity.ok(
                userService.searchUsers(keyword)
        );
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {

        String firebaseUid = authentication.getName();

        return ResponseEntity.ok(
                userService.getMyProfile(firebaseUid)
        );
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(
            @RequestBody @Valid UpdateProfileRequest request,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();

        return ResponseEntity.ok(
                userService.updateMyProfile(firebaseUid, request)
        );
    }

    @PostMapping("/save-fcm-token")
    public ResponseEntity<?> saveFcmToken(
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {

        String firebaseUid = authentication.getName();
        String token = body.get("fcmToken");

        userService.saveFcmToken(firebaseUid, token);

        return ResponseEntity.ok("Token saved");
    }
}
