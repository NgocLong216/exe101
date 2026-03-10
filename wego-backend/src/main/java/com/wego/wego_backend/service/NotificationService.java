package com.wego.wego_backend.service;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.entity.GroupMember;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.GroupMemberRepository;
import com.wego.wego_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private GroupMemberRepository groupMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FirebaseService firebaseService;

    public void notifyMeetStart(Group group) {

        List<GroupMember> members =
                groupMemberRepository.findByGroup_IdAndStatus(
                        group.getId(),
                        GroupMemberStatus.ACCEPTED
                );

        for (GroupMember member : members) {

            User user = userRepository
                    .findById(member.getUserFirebaseUid())
                    .orElse(null);

            if (user != null && user.getFcmToken() != null) {

                firebaseService.sendPushNotification(
                        user.getFcmToken(),
                        "Đến giờ Meet!",
                        "Nhóm \"" + group.getTitle() + "\" đã đến giờ gặp nhau!"
                );
            }
        }
    }
}