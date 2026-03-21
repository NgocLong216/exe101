package com.wego.wego_backend.config;

import com.cloudinary.Cloudinary;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary() {

        return new Cloudinary(
                Map.of(
                        "cloud_name", "dagdecq9j",
                        "api_key", "992724475554169",
                        "api_secret", "lUuPFl34wqwUAhBU1iq_UbwkOXU"
                )
        );
    }
}