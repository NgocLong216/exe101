package com.wego.wego_backend.service;

import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.wego.wego_backend.entity.UserAiProfile;
import com.wego.wego_backend.repository.UserAiProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class UserAiProfileService {

    private static final Map<String, List<String>> TAG_KEYWORDS = Map.ofEntries(
            Map.entry("quán cà phê", List.of("cà phê", "cafe", "coffee")),
            Map.entry("quán nướng", List.of("quán nướng", "đồ nướng", "bbq")),
            Map.entry("buffet", List.of("buffet")),
            Map.entry("nhà hàng nhật", List.of("đồ nhật", "nhà hàng nhật", "sushi", "izakaya")),
            Map.entry("nhà hàng", List.of("nhà hàng", "restaurant")),
            Map.entry("wifi", List.of("wifi", "wi-fi")),
            Map.entry("yên tĩnh", List.of("yên tĩnh", "quiet")),
            Map.entry("ấm cúng", List.of("ấm cúng", "cozy", "cosy")),
            Map.entry("lãng mạn", List.of("lãng mạn", "romantic")),
            Map.entry("sang trọng", List.of("sang trọng", "luxury", "upscale")),
            Map.entry("giá phải chăng", List.of("giá rẻ", "bình dân", "phải chăng")),
            Map.entry("rating cao", List.of("rating cao", "đánh giá cao")),
            Map.entry("quận 1", List.of("quận 1", "q1", "q.1")),
            Map.entry("quận 3", List.of("quận 3", "q3", "q.3")),
            Map.entry("quận 7", List.of("quận 7", "q7", "q.7")),
            Map.entry("thủ đức", List.of("thủ đức"))
    );

    private final FirebaseDatabase firebaseDatabase;
    private final UserAiProfileRepository profileRepository;
    private final ObjectMapper objectMapper;
    private final UserService userService;

    public void invalidate(String firebaseUid) {
        profileRepository.deleteById(firebaseUid);
    }

    @Transactional
    public Map<String, Object> syncFromPersonalChats(String firebaseUid) {
        try {
            DatabaseReference reference = firebaseDatabase
                    .getReference("personal_ai_chats")
                    .child(firebaseUid);
            DataSnapshot root = readOnce(reference);

            List<String> userMessages = new ArrayList<>();
            int totalMessages = 0;
            long lastTimestamp = 0L;

            for (DataSnapshot session : root.getChildren()) {
                for (DataSnapshot message : session.getChildren()) {
                    totalMessages++;
                    String role = message.child("role").getValue(String.class);
                    Long timestamp = message.child("timestamp").getValue(Long.class);
                    if (timestamp != null) {
                        lastTimestamp = Math.max(lastTimestamp, timestamp);
                    }

                    if ("user".equalsIgnoreCase(role)) {
                        String text = message.child("text").getValue(String.class);
                        if (text != null && !text.isBlank()) {
                            userMessages.add(text.trim());
                        }
                    }
                }
            }

            UserAiProfile existing = profileRepository.findById(firebaseUid).orElse(null);
            if (existing != null
                    && existing.getSourceMessageCount() == totalMessages
                    && existing.getSourceLastTimestamp() == lastTimestamp) {
                return deserialize(existing.getProfileJson());
            }

            Map<String, Object> profile = buildProfile(firebaseUid, userMessages);
            UserAiProfile entity = existing == null ? new UserAiProfile() : existing;
            entity.setFirebaseUid(firebaseUid);
            entity.setProfileJson(objectMapper.writeValueAsString(profile));
            entity.setSourceMessageCount(totalMessages);
            entity.setSourceLastTimestamp(lastTimestamp);
            entity.setSyncedAt(LocalDateTime.now());
            profileRepository.save(entity);
            return profile;
        } catch (Exception exception) {
            return profileRepository.findById(firebaseUid)
                    .map(item -> deserialize(item.getProfileJson()))
                    .orElseGet(() -> emptyProfile(firebaseUid));
        }
    }

    private DataSnapshot readOnce(DatabaseReference reference) throws Exception {
        CompletableFuture<DataSnapshot> future = new CompletableFuture<>();
        reference.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                future.complete(snapshot);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                future.completeExceptionally(error.toException());
            }
        });
        return future.get(10, TimeUnit.SECONDS);
    }

    private Map<String, Object> buildProfile(
            String firebaseUid,
            List<String> userMessages
    ) {
        Set<String> tags = new LinkedHashSet<>();
        for (String message : userMessages) {
            String normalized = message.toLowerCase(Locale.ROOT);
            TAG_KEYWORDS.forEach((tag, keywords) -> {
                if (keywords.stream().anyMatch(normalized::contains)) {
                    tags.add(tag);
                }
            });
        }

        int fromIndex = Math.max(0, userMessages.size() - 20);
        Map<String, Object> profile = emptyProfile(firebaseUid);
        Map<String, Object> hobbies = userService.getHobbyPreferences(firebaseUid);
        addStringValues(tags, hobbies.get("destinations"));
        addStringValues(tags, hobbies.get("vibes"));
        profile.put("tags", new ArrayList<>(tags));
        profile.put("hobby_preferences", Map.of(
                "destinations", hobbies.getOrDefault("destinations", List.of()),
                "vibes", hobbies.getOrDefault("vibes", List.of())
        ));
        profile.put("recent_requests", new ArrayList<>(userMessages.subList(
                fromIndex,
                userMessages.size()
        )));
        return profile;
    }

    private void addStringValues(Set<String> target, Object values) {
        if (!(values instanceof List<?> list)) return;
        list.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .forEach(target::add);
    }

    private Map<String, Object> emptyProfile(String firebaseUid) {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("user_id", firebaseUid);
        profile.put("tags", new ArrayList<>());
        profile.put("liked_places", new ArrayList<>());
        profile.put("recent_requests", new ArrayList<>());
        return profile;
    }

    private Map<String, Object> deserialize(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception exception) {
            return new LinkedHashMap<>();
        }
    }
}
