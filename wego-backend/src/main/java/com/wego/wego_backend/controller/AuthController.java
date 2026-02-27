package com.wego.wego_backend.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.wego.wego_backend.config.JwtUtil;
import com.wego.wego_backend.dto.GoogleLoginRequest;
import com.wego.wego_backend.dto.GoogleUserInfo;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import com.wego.wego_backend.service.GoogleAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private GoogleAuthService googleAuthService;

    @PostMapping("/google")
    public ResponseEntity<?> loginWithGoogle(
            @RequestBody GoogleLoginRequest request
    ) {
        FirebaseToken decoded;
        try {
            decoded = FirebaseAuth.getInstance()
                    .verifyIdToken(request.getToken());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid token");
        }

        return ResponseEntity.ok(
                googleAuthService.loginWithFirebaseToken(decoded)
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @RequestHeader("Authorization") String authHeader
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing token");
        }

        String jwt = authHeader.substring(7);

        String firebaseUid = jwtUtil.extractFirebaseUid(jwt);

        googleAuthService.logout(firebaseUid);

        return ResponseEntity.ok("Logged out successfully");
    }
}
