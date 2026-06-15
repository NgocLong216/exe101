package com.wego.wego_backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.FirebaseDatabase;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp() throws IOException {

        GoogleCredentials credentials;

        String firebaseJson = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");

        if (firebaseJson != null && !firebaseJson.isBlank()) {

            // Render
            credentials = GoogleCredentials.fromStream(
                    new ByteArrayInputStream(
                            firebaseJson.getBytes(StandardCharsets.UTF_8)
                    )
            );

        } else {

            // Local
            ClassPathResource resource =
                    new ClassPathResource("firebase-service-account.json");

            InputStream serviceAccount = resource.getInputStream();

            credentials = GoogleCredentials.fromStream(serviceAccount);
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .setDatabaseUrl(
                        "https://crested-drive-483712-e5-default-rtdb.firebaseio.com"
                )
                .build();

        if (FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.initializeApp(options);
        }

        return FirebaseApp.getInstance();
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }

    @Bean
    public FirebaseDatabase firebaseDatabase(
            FirebaseApp firebaseApp) {

        return FirebaseDatabase.getInstance(firebaseApp);
    }
}

