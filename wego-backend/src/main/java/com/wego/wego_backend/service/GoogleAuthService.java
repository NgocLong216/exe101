package com.wego.wego_backend.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.wego.wego_backend.dto.GoogleUserInfo;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;

import java.util.Map;


@Service
public class GoogleAuthService {

    @Autowired
    private UserRepository userRepository;


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

        return userRepository.findByFirebaseUid(firebaseUid)
                .orElseGet(() -> {
                    User u = new User();
                    u.setFirebaseUid(firebaseUid);
                    u.setEmail(decoded.getEmail());
                    u.setName(decoded.getName());
                    u.setAvatar(decoded.getPicture());
                    return userRepository.save(u);
                });
    }

    public User loginWithAuth0(Jwt jwt) {

        String auth0Id = jwt.getSubject();

        return userRepository.findById(auth0Id)
                .orElseGet(() -> {

                    User user = new User();

                    user.setFirebaseUid(auth0Id);

                    user.setEmail(jwt.getClaim("email"));
                    user.setName(jwt.getClaim("name"));
                    user.setAvatar(jwt.getClaim("picture"));

                    return userRepository.save(user);
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
