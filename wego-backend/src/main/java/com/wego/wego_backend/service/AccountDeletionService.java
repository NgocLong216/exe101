package com.wego.wego_backend.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.FirebaseDatabase;
import com.wego.wego_backend.entity.GroupMember;
import com.wego.wego_backend.repository.AiQueryHistoryRepository;
import com.wego.wego_backend.repository.GroupMemberRepository;
import com.wego.wego_backend.repository.GroupRepository;
import com.wego.wego_backend.repository.PaymentRepository;
import com.wego.wego_backend.repository.UserAiProfileRepository;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final UserAiProfileRepository userAiProfileRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final PaymentRepository paymentRepository;
    private final AiQueryHistoryRepository aiQueryHistoryRepository;
    private final GroupService groupService;
    private final FirebaseRealtimeService firebaseRealtimeService;
    private final FirebaseDatabase firebaseDatabase;
    private final FirebaseAuth firebaseAuth;

    @Transactional
    public void deleteAccount(String firebaseUid) {
        if (!userRepository.existsById(firebaseUid)) {
            throw new IllegalArgumentException("User not found");
        }

        // Hosted groups cannot remain without an owner.
        groupRepository.findByHostFirebaseUid(firebaseUid)
                .forEach(group -> groupService.deleteGroup(group.getId(), firebaseUid));

        List<GroupMember> memberships =
                groupMemberRepository.findByUserFirebaseUid(firebaseUid);
        memberships.forEach(member -> firebaseRealtimeService.removeMember(
                member.getGroup().getId(),
                firebaseUid
        ));

        groupMemberRepository.deleteByUserFirebaseUid(firebaseUid);
        userAiProfileRepository.deleteById(firebaseUid);
        paymentRepository.deleteByFirebaseUid(firebaseUid);
        aiQueryHistoryRepository.deleteBySenderFirebaseUid(firebaseUid);

        firebaseDatabase.getReference("personal_ai_chats")
                .child(firebaseUid).removeValueAsync();
        firebaseDatabase.getReference("live_locations")
                .child(firebaseUid).removeValueAsync();
        firebaseDatabase.getReference("presence")
                .child(firebaseUid).removeValueAsync();

        userRepository.deleteById(firebaseUid);

        try {
            firebaseAuth.deleteUser(firebaseUid);
        } catch (Exception exception) {
            throw new RuntimeException("Could not delete Firebase account", exception);
        }
    }
}
