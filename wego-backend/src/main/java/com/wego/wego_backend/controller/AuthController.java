package com.wego.wego_backend.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.wego.wego_backend.dto.GoogleLoginRequest;
import com.wego.wego_backend.service.GoogleAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Missing token");
        }

        String firebaseToken = authHeader.substring(7);

        try {
            FirebaseToken decoded = FirebaseAuth.getInstance()
                    .verifyIdToken(firebaseToken);

            googleAuthService.logout(decoded.getUid());

            return ResponseEntity.ok("Logged out successfully");

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid token");
        }
    }
}
