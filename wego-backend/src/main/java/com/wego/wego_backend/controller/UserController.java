package com.wego.wego_backend.controller;

import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam String keyword
    ) {
        return ResponseEntity.ok(
                userRepository.findByNameContainingIgnoreCase(keyword)
        );
    }
}
