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
    private final GoogleDirectionsService directionsService;
    private final GooglePlacesService placesService;

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

        if (locations.size() < 2)
            throw new RuntimeException("Not enough members with location");

        // 3. Center hình học ban đầu
        LatLng center = average(locations.values());

        // 4. Refine theo thời gian di chuyển (2 vòng)
        for (int i = 0; i < 2; i++) {
            Map<String, Long> times = new HashMap<>();

            for (var e : locations.entrySet()) {
                long t = directionsService.getTravelTimeSeconds(
                        e.getValue(),
                        center
                );
                times.put(e.getKey(), t);
            }

            center = weightedCenter(locations, times);
        }

        // 5. Tìm địa điểm
        var places = placesService.searchNearby(center, keyword);

        return new SuggestedPlaceResponse(
                new SuggestedPlaceResponse.CenterPoint(
                        center.getLat(),
                        center.getLng()
                ),
                places
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


    private LatLng weightedCenter(
            Map<String, LatLng> locations,
            Map<String, Long> times
    ) {
        double lat = 0, lng = 0, sum = 0;

        for (String uid : locations.keySet()) {
            double w = times.get(uid);
            LatLng p = locations.get(uid);

            lat += p.getLat() * w;
            lng += p.getLng() * w;
            sum += w;
        }
        return new LatLng(lat / sum, lng / sum);
    }

}

