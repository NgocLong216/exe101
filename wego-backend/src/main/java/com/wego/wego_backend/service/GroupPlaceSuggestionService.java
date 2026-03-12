package com.wego.wego_backend.service;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.dto.LatLng;
import com.wego.wego_backend.dto.SuggestedPlaceResponse;
import com.wego.wego_backend.entity.GroupMember;
import com.wego.wego_backend.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class GroupPlaceSuggestionService {

    private final GroupMemberRepository groupMemberRepository;
    private final FirebaseLocationService firebaseLocationService;
    private final GoongDirectionsService directionsService;
    private final SerpApiPlacesService placesService;

    public SuggestedPlaceResponse suggest(UUID groupId, String keyword) {

        // 1. Lấy member UID
        List<String> memberUids =
                groupMemberRepository
                        .findByGroupIdAndStatus(groupId, GroupMemberStatus.ACCEPTED)
                        .stream()
                        .map(GroupMember::getUserFirebaseUid)
                        .toList();

        // 2. Lấy vị trí realtime
        Map<String, LatLng> locations =
                firebaseLocationService.getLocations(memberUids);

        // Chỉ cần >=1 user
        if (locations.isEmpty())
            throw new RuntimeException("No member location found");

        // 3. Tính center
        LatLng center;

        if (locations.size() == 1) {
            center = locations.values().iterator().next(); // lấy luôn vị trí user
        } else {
            center = average(locations.values());
        }

        System.out.println("Center lat: " + center.getLat());
        System.out.println("Center lng: " + center.getLng());

        // 4. Tìm địa điểm quanh center
        List<SuggestedPlaceResponse.PlaceDto> places =
                placesService.searchNearby(center, keyword)
                        .stream()
                        .limit(5)   // chỉ lấy 5 place
                        .toList();

        // 5. Tính travel time user → place
        List<SuggestedPlaceResponse.PlaceDto> validPlaces = new ArrayList<>();

        for (SuggestedPlaceResponse.PlaceDto place : places) {

            LatLng placeLatLng = new LatLng(place.getLat(), place.getLng());

            long totalTime = 0;
            int count = 0;

            for (LatLng userLocation : locations.values()) {

                long time = directionsService.getTravelTimeSeconds(
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

        // 6. Sort theo thời gian di chuyển
        validPlaces.sort(Comparator.comparingLong(
                SuggestedPlaceResponse.PlaceDto::getTravelTime
        ));

        // 7. Lấy top 5
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
        double lat = 0, lng = 0;

        for (LatLng p : points) {
            lat += p.getLat();
            lng += p.getLng();
        }

        return new LatLng(lat / points.size(), lng / points.size());
    }
}