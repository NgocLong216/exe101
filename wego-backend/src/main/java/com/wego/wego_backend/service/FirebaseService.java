package com.wego.wego_backend.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FirebaseService {

    private final UserRepository userRepository;

    public void sendPushNotification(String token, String title, String body) {

        System.out.println("Sending push to: " + token);

        Message message = Message.builder()
                .setToken(token)
                .putData("title", title)
                .putData("body", body)
                .build();

        try {

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("Push sent successfully: " + response);

        } catch (FirebaseMessagingException e) {

            if (e.getMessagingErrorCode() != null &&
                    e.getMessagingErrorCode().name().equals("UNREGISTERED")) {

                System.out.println(" Token không còn hợp lệ, xóa khỏi DB");

                userRepository.findByFcmToken(token).ifPresent(user -> {
                    user.setFcmToken(null);
                    userRepository.save(user);
                });
            }

            e.printStackTrace();
        }
    }
}