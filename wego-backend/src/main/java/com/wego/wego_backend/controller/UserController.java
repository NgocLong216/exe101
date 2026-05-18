package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.SuggestPlaceRequest;
import com.wego.wego_backend.dto.UpdateProfileRequest;
import com.wego.wego_backend.repository.UserRepository;
import com.wego.wego_backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMyProfile(

            @RequestParam String name,
            @RequestParam(required = false) MultipartFile avatar,

            Authentication authentication
    ) {

        String firebaseUid = authentication.getName();

        return ResponseEntity.ok(
                userService.updateMyProfile(firebaseUid, name, avatar)
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

    @PostMapping("/suggest-place")
    public ResponseEntity<?> suggestPlace(
            @RequestBody SuggestPlaceRequest request,
            Authentication authentication
    ) {

        String firebaseUid = authentication.getName();

        return ResponseEntity.ok(
                userService.suggest(
                        firebaseUid,
                        request.getKeyword()
                )
        );
    }
}
