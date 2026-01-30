package com.wego.wego_backend.controller;

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
    private GoogleAuthService googleAuthService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/google")
    public ResponseEntity<?> loginWithGoogle(
            @RequestBody GoogleLoginRequest request
    ) {
        GoogleUserInfo googleUser =
                googleAuthService.getUserInfo(request.getToken());

        if (googleUser.getEmail() == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Không lấy được email từ Google");
        }

        User user = userRepository
                .findByEmail(googleUser.getEmail())
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(googleUser.getEmail());
                    newUser.setName(
                            googleUser.getName() != null
                                    ? googleUser.getName()
                                    : googleUser.getEmail()
                    );
                    newUser.setAvatar(googleUser.getAvatar());
                    return userRepository.save(newUser);
                });


        String jwt = jwtUtil.generateToken(user);

        return ResponseEntity.ok(Map.of(
                "token", jwt,
                "user", user
        ));
    }
}
