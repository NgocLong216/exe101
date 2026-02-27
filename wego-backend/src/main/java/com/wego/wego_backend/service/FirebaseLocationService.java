package com.wego.wego_backend.service;

import com.google.firebase.database.*;
import com.wego.wego_backend.dto.LatLng;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@Service
public class FirebaseLocationService {

    private final DatabaseReference database;

    public FirebaseLocationService() {
        this.database =
                FirebaseDatabase.getInstance().getReference("live_locations");
    }

    public Map<String, LatLng> getLocations(List<String> firebaseUids) {

        Map<String, LatLng> result = new ConcurrentHashMap<>();
        CountDownLatch latch = new CountDownLatch(firebaseUids.size());

        for (String uid : firebaseUids) {
            database.child(uid)
                    .addListenerForSingleValueEvent(new ValueEventListener() {

                        @Override
                        public void onDataChange(DataSnapshot snapshot) {
                            if (snapshot.exists()) {
                                Double lat = snapshot.child("lat").getValue(Double.class);
                                Double lng = snapshot.child("lng").getValue(Double.class);

                                if (lat != null && lng != null) {
                                    result.put(uid, new LatLng(lat, lng));
                                }
                            }
                            latch.countDown();
                        }

                        @Override
                        public void onCancelled(DatabaseError error) {
                            latch.countDown();
                        }
                    });
        }

        try {
            latch.await(3, TimeUnit.SECONDS); // timeout safety
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        return result;
    }
}


