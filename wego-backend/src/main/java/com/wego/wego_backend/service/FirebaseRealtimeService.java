package com.wego.wego_backend.service;

import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class FirebaseRealtimeService {

    public void addMember(
            UUID groupId,
            String firebaseUid
    ) {

        DatabaseReference ref =
                FirebaseDatabase.getInstance()
                        .getReference("group_members")
                        .child(groupId.toString())
                        .child(firebaseUid);

        ref.setValueAsync(true);
    }

    public void removeMember(
            UUID groupId,
            String firebaseUid
    ) {

        DatabaseReference ref =
                FirebaseDatabase.getInstance()
                        .getReference("group_members")
                        .child(groupId.toString())
                        .child(firebaseUid);

        ref.removeValueAsync();
    }

    public void deleteGroup(UUID groupId) {

        FirebaseDatabase.getInstance()
                .getReference("group_members")
                .child(groupId.toString())
                .removeValueAsync();

        FirebaseDatabase.getInstance()
                .getReference("group_chats")
                .child(groupId.toString())
                .removeValueAsync();
    }
}
