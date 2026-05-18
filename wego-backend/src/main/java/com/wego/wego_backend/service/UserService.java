package com.wego.wego_backend.service;

import com.wego.wego_backend.dto.LatLng;
import com.wego.wego_backend.dto.SuggestedPlaceResponse;
import com.wego.wego_backend.dto.UpdateProfileRequest;
import com.wego.wego_backend.dto.UserProfileResponse;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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

    public List<UserProfileResponse> searchUsers(String keyword) {

        List<User> users = userRepository
                .findByNameContainingIgnoreCase(keyword);

        return users.stream()
                .map(user -> new UserProfileResponse(
                        user.getFirebaseUid(),
                        user.getName(),
                        user.getEmail(),
                        user.getAvatar()
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
                user.getAvatar()
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
                placesService.searchNearby(center, keyword)
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

            if (count == 0) {
                place.setTravelTime(9999);
                validPlaces.add(place);
                continue;
            }

            long avgTime = totalTime / count;

            place.setTravelTime(avgTime);

            validPlaces.add(place);
        }

        // 6. Sort theo travel time
        validPlaces.sort(
                Comparator.comparingLong(
                        SuggestedPlaceResponse.PlaceDto::getTravelTime
                )
        );

        // 7. Top 5
        List<SuggestedPlaceResponse.PlaceDto> bestPlaces =
                validPlaces.stream().limit(5).toList();

        return new SuggestedPlaceResponse(
                new SuggestedPlaceResponse.CenterPoint(
                        center.getLat(),
                        center.getLng()
                ),
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
}