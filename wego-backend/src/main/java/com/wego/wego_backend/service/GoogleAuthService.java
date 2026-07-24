package com.wego.wego_backend.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.wego.wego_backend.dto.GoogleUserInfo;
import com.wego.wego_backend.entity.Role;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.RoleRepository;
import com.wego.wego_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;

import java.time.LocalDateTime;
import java.util.Map;


@Service
public class GoogleAuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private static final String GOOGLE_USERINFO_URL =
            "https://www.googleapis.com/oauth2/v3/userinfo";

    public GoogleUserInfo getUserInfo(String accessToken) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<GoogleUserInfo> response =
                    restTemplate.exchange(
                            GOOGLE_USERINFO_URL,
                            HttpMethod.GET,
                            entity,
                            GoogleUserInfo.class
                    );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Google access_token không hợp lệ");
        }
    }

    public User loginWithFirebaseToken(FirebaseToken decoded) {

        String firebaseUid = decoded.getUid();

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow();

        return userRepository.findByFirebaseUid(firebaseUid)
                .map(user -> {
                    if (Boolean.FALSE.equals(user.getStatus())) {
                        throw new IllegalStateException("Account has been deleted");
                    }
                    return user;
                })
                .orElseGet(() -> {
                    User u = new User();
                    u.setFirebaseUid(firebaseUid);
                    u.setEmail(decoded.getEmail());
                    u.setName(decoded.getName());
                    u.setAvatar(decoded.getPicture());
                    u.setRole(userRole);
                    u.setCreatedAt(LocalDateTime.now());
                    return userRepository.save(u);
                });
    }



    public void logout(String firebaseUid) {
        try {
            FirebaseAuth.getInstance().revokeRefreshTokens(firebaseUid);
        } catch (Exception e) {
            throw new RuntimeException("Logout failed");
        }
    }
}
