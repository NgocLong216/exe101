package com.wego.wego_backend.service;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.dto.LatLng;
import com.wego.wego_backend.dto.SuggestedPlaceResponse;
import com.wego.wego_backend.entity.GroupMember;
import com.wego.wego_backend.repository.GroupMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupPlaceSuggestionService {

    private final GroupMemberRepository groupMemberRepository;
    private final FirebaseLocationService firebaseLocationService;
    private final GoongDirectionsService directionsService;
    private final SerpApiPlacesService placesService;
    private final AiPlaceService aiPlaceService;

    public SuggestedPlaceResponse suggest(
            UUID groupId,
            String keyword
    ) {

        // =========================================
        // 1. LẤY MEMBER TRONG GROUP
        // =========================================

        List<String> memberUids =
                groupMemberRepository
                        .findByGroup_IdAndStatus(
                                groupId,
                                GroupMemberStatus.ACCEPTED
                        )
                        .stream()
                        .map(GroupMember::getUserFirebaseUid)
                        .toList();

        if (memberUids.isEmpty()) {
            throw new RuntimeException(
                    "No accepted members in group"
            );
        }

        // =========================================
        // 2. LẤY REALTIME LOCATION
        // =========================================

        Map<String, LatLng> locations =
                firebaseLocationService.getLocations(memberUids);

        if (locations.isEmpty()) {
            throw new RuntimeException(
                    "No member location found"
            );
        }

        log.info("GROUP MEMBERS: {}", memberUids.size());

        // =========================================
        // 3. CALL AI SERVICE
        // =========================================

        Map<String, Object> aiResponse =
                aiPlaceService.search(keyword);

        if (aiResponse == null) {
            throw new RuntimeException(
                    "AI service returned null"
            );
        }

        log.info("AI RESPONSE RECEIVED");

        // =========================================
        // 4. EXTRACT PLACES
        // =========================================

        List<Map<String, Object>> rawPlaces =
                (List<Map<String, Object>>) aiResponse.get("places");

        if (rawPlaces == null || rawPlaces.isEmpty()) {

            return new SuggestedPlaceResponse(
                    Collections.emptyList()
            );
        }

        List<SuggestedPlaceResponse.PlaceDto> places =
                new ArrayList<>();

        for (Map<String, Object> p : rawPlaces) {

            try {

                Double lat = getDouble(p.get("latitude"));
                Double lng = getDouble(p.get("longitude"));

                if (lat == null || lng == null)
                    continue;

                SuggestedPlaceResponse.PlaceDto place =
                        new SuggestedPlaceResponse.PlaceDto(
                                (String) p.getOrDefault(
                                        "place_id",
                                        UUID.randomUUID().toString()
                                ),

                                (String) p.getOrDefault(
                                        "title",
                                        "Unknown"
                                ),

                                (String) p.getOrDefault(
                                        "address",
                                        ""
                                ),

                                lat,
                                lng,

                                getDoubleOrZero(
                                        p.get("rating")
                                ),

                                getIntOrZero(
                                        p.get("reviews")
                                ),

                                (String) p.getOrDefault(
                                        "hours",
                                        ""
                                ),

                                castStringList(
                                        p.get("atmosphere")
                                ),

                                castStringList(
                                        p.get("amenities")
                                ),


                                (String) p.getOrDefault(
                                        "thumbnail",
                                        ""
                                )
                        );

                places.add(place);

            } catch (Exception e) {

                log.error(
                        "PLACE PARSE ERROR: {}",
                        e.getMessage()
                );
            }
        }

        // =========================================
        // 5. TÍNH TRAVEL TIME
        // =========================================

        List<SuggestedPlaceResponse.PlaceDto> validPlaces =
                new ArrayList<>();

        for (SuggestedPlaceResponse.PlaceDto place : places) {

            LatLng destination =
                    new LatLng(
                            place.getLat(),
                            place.getLng()
                    );

            long totalTime = 0;

            int validUserCount = 0;

            for (LatLng userLocation : locations.values()) {

                try {

                    long time =
                            directionsService
                                    .getTravelTimeSeconds(
                                            userLocation,
                                            destination
                                    );

                    if (time == Long.MAX_VALUE)
                        continue;

                    totalTime += time;

                    validUserCount++;

                } catch (Exception e) {

                    log.error(
                            "DIRECTION ERROR: {}",
                            e.getMessage()
                    );
                }
            }



            validPlaces.add(place);
        }



        // =========================================
        // 7. TOP 5
        // =========================================

        List<SuggestedPlaceResponse.PlaceDto> bestPlaces =
                validPlaces
                        .stream()
                        .limit(5)
                        .toList();

        log.info(
                "FINAL PLACES: {}",
                bestPlaces.size()
        );

        return new SuggestedPlaceResponse(bestPlaces);
    }

    // =========================================
    // HELPERS
    // =========================================

    private Double getDouble(Object value) {

        if (value == null)
            return null;

        if (value instanceof Number number) {
            return number.doubleValue();
        }

        return null;
    }

    private double getDoubleOrZero(Object value) {

        Double d = getDouble(value);

        return d != null ? d : 0.0;
    }

    private int getIntOrZero(Object value) {

        if (value instanceof Number number) {
            return number.intValue();
        }

        return 0;
    }

    @SuppressWarnings("unchecked")
    private List<String> castStringList(Object value) {

        if (!(value instanceof List<?> list)) {
            return new ArrayList<>();
        }

        return list.stream()
                .map(Object::toString)
                .toList();
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