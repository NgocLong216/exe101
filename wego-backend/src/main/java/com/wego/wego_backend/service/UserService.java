package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.LatLng;
import com.wego.wego_backend.dto.SuggestedPlaceResponse;
import com.wego.wego_backend.dto.UpdateProfileRequest;
import com.wego.wego_backend.dto.UserProfileResponse;
import com.wego.wego_backend.dto.HobbyPreferencesRequest;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final FirebaseLocationService firebaseLocationService;
    private final GoongDirectionsService directionsService;
    private final SerpApiPlacesService placesService;
    private final ObjectMapper objectMapper;

    public Map<String, Object> getHobbyPreferences(String firebaseUid) {
        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, Object> preferences = parseHobbyPreferences(user);
        preferences.put("completed", Boolean.TRUE.equals(user.getHobbyOnboardingCompleted()));
        return preferences;
    }

    @Transactional
    public Map<String, Object> saveHobbyPreferences(
            String firebaseUid,
            HobbyPreferencesRequest request
    ) {
        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, Object> preferences = new LinkedHashMap<>();
        preferences.put("destinations", sanitizePreferences(request.getDestinations()));
        preferences.put("vibes", sanitizePreferences(request.getVibes()));
        try {
            user.setHobbyPreferencesJson(objectMapper.writeValueAsString(preferences));
        } catch (Exception exception) {
            throw new RuntimeException("Could not save hobby preferences", exception);
        }
        user.setHobbyOnboardingCompleted(true);
        userRepository.save(user);
        preferences.put("completed", true);
        return preferences;
    }

    public Map<String, Object> parseHobbyPreferences(User user) {
        if (user.getHobbyPreferencesJson() == null || user.getHobbyPreferencesJson().isBlank()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("destinations", new ArrayList<>());
            empty.put("vibes", new ArrayList<>());
            return empty;
        }
        try {
            return objectMapper.readValue(
                    user.getHobbyPreferencesJson(),
                    new TypeReference<>() {}
            );
        } catch (Exception exception) {
            throw new RuntimeException("Invalid stored hobby preferences", exception);
        }
    }

    private List<String> sanitizePreferences(List<String> values) {
        if (values == null) return new ArrayList<>();
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .distinct()
                .limit(20)
                .toList();
    }

    public List<UserProfileResponse> searchUsers(String keyword) {

        List<User> users = userRepository
                .findByNameContainingIgnoreCaseAndStatusTrue(keyword);

        return users.stream()
                .map(user -> new UserProfileResponse(
                        user.getFirebaseUid(),
                        user.getName(),
                        user.getEmail(),
                        user.getAvatar(),
                        user.getPlan(),
                        user.getPlanExpiresAt()
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
                user.getAvatar(),
                user.getPlan(),
                user.getPlanExpiresAt()
        );
    }

    public User updateMyProfile(
            String firebaseUid,
            String name,
            MultipartFile avatar
    ) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(name);

        if (avatar != null && !avatar.isEmpty()) {

            String avatarUrl = cloudinaryService.uploadFile(avatar);
            user.setAvatar(avatarUrl);
        }

        return userRepository.save(user);
    }

    public void saveFcmToken(String firebaseUid, String token) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setFcmToken(token);
        userRepository.save(user);
    }

    public SuggestedPlaceResponse suggest(
            String firebaseUid,
            String keyword
    ) {

        // 1. Chỉ có đúng 1 user
        List<String> memberUids = List.of(firebaseUid);

        // 2. Lấy vị trí realtime
        Map<String, LatLng> locations =
                firebaseLocationService.getLocations(memberUids);

        // Chỉ cần >=1 user
        if (locations.isEmpty())
            throw new RuntimeException("User location not found");

        // 3. Tính center
        LatLng center;

        if (locations.size() == 1) {
            center = locations.values().iterator().next();
        } else {
            center = average(locations.values());
        }

        System.out.println("Center lat: " + center.getLat());
        System.out.println("Center lng: " + center.getLng());

        // 4. Tìm địa điểm quanh center
        List<SuggestedPlaceResponse.PlaceDto> places =
                placesService.searchNearby(keyword)
                        .stream()
                        .limit(5)
                        .toList();

        // 5. Tính travel time
        List<SuggestedPlaceResponse.PlaceDto> validPlaces =
                new ArrayList<>();

        for (SuggestedPlaceResponse.PlaceDto place : places) {

            LatLng placeLatLng =
                    new LatLng(place.getLat(), place.getLng());

            long totalTime = 0;
            int count = 0;

            for (LatLng userLocation : locations.values()) {

                long time =
                        directionsService.getTravelTimeSeconds(
                                userLocation,
                                placeLatLng
                        );

                if (time == Long.MAX_VALUE) continue;

                totalTime += time;
                count++;
            }


            validPlaces.add(place);
        }

        // 6. Sort theo travel time


        // 7. Top 5
        List<SuggestedPlaceResponse.PlaceDto> bestPlaces =
                validPlaces.stream().limit(5).toList();

        return new SuggestedPlaceResponse(
                bestPlaces
        );
    }

    private LatLng average(Collection<LatLng> points) {

        double lat = 0;
        double lng = 0;

        for (LatLng p : points) {
            lat += p.getLat();
            lng += p.getLng();
        }

        return new LatLng(
                lat / points.size(),
                lng / points.size()
        );
    }

    public void updatePushToken(
            String uid,
            String token
    ){

        User user = userRepository
                .findById(uid)
                .orElseThrow();

        user.setExpoPushToken(token);

        userRepository.save(user);
    }

    @Transactional
    public void updateNotificationSetting(
            String firebaseUid,
            Boolean enabled
    ) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        user.setNotificationsEnabled(enabled);

        userRepository.save(user);
    }

    @Transactional
    public void updateLocationSharing(
            String firebaseUid,
            Boolean enabled
    ) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        user.setLocationSharingEnabled(enabled);

        userRepository.save(user);
    }
}
