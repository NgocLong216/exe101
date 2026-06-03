package com.wego.wego_backend.service;

import com.wego.wego_backend.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    private static final String SECRET = "SECRET_KEY_123_SECRET_KEY_123_SECRET";

    private static final long EXPIRATION_MS = 86400000; // 1 ngày

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(User user) {
        Date now = new Date();

        return Jwts.builder()
                .setSubject(user.getFirebaseUid())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + EXPIRATION_MS))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
}
