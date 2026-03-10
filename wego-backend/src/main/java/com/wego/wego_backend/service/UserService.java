package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.UpdateProfileRequest;
import com.wego.wego_backend.dto.UserProfileResponse;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<UserProfileResponse> searchUsers(String keyword) {

        List<User> users = userRepository
                .findByNameContainingIgnoreCase(keyword);

        return users.stream()
                .map(user -> new UserProfileResponse(
                        user.getFirebaseUid(),
                        user.getName(),
                        user.getEmail(),
                        user.getAvatar()
                ))
                .collect(Collectors.toList());
    }

    public UserProfileResponse getMyProfile(String firebaseUid) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new UserProfileResponse(
                user.getFirebaseUid(),
                user.getName(),
                user.getEmail(),
                user.getAvatar()
        );
    }

    public User updateMyProfile(String firebaseUid, UpdateProfileRequest request) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(request.getName());

        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }

        return userRepository.save(user);
    }

    public void saveFcmToken(String firebaseUid, String token) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setFcmToken(token);
        userRepository.save(user);
    }
}