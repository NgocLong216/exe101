package com.wego.wego_backend.service;

import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;

    public void requireAdmin(String firebaseUid) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow();

        if (!"ADMIN".equals(user.getRole().getName())) {
            throw new RuntimeException("Access denied");
        }
    }

    public List<User> getAllUsers(String currentUid) {

        requireAdmin(currentUid);

        return userRepository.findAll();
    }
}
