package com.wego.wego_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WegoBackendApplication {
	public static void main(String[] args) {
		SpringApplication.run(WegoBackendApplication.class, args);
	}

}
