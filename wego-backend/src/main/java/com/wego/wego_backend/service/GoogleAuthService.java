package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.GoogleUserInfo;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;


@Service
public class GoogleAuthService {

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
}
