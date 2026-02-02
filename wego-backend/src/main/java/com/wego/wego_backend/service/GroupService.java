package com.wego.wego_backend.service;

import com.wego.wego_backend.constant.GroupRole;
import com.wego.wego_backend.constant.GroupStatus;
import com.wego.wego_backend.dto.CreateGroupRequest;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.entity.GroupMember;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.GroupMemberRepository;
import com.wego.wego_backend.repository.GroupRepository;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    public Group createGroup(CreateGroupRequest request, User host) {

        Group group = new Group();
        group.setTitle(request.getTitle());
        group.setDescription(request.getDescription());

        // Có thể null – set sau
        group.setMeetingTime(request.getMeetingTime());

        group.setLocationLat(request.getLat());
        group.setLocationLng(request.getLng());
        group.setPlaceId(request.getPlaceId());

        group.setHost(host);
        group.setStatus(GroupStatus.WAITING);
        group.setCreatedAt(LocalDateTime.now());

        groupRepository.save(group);

        // Add host as member
        GroupMember hostMember = new GroupMember();
        hostMember.setGroup(group);
        hostMember.setUser(host);
        hostMember.setRole(GroupRole.HOST);
        hostMember.setJoinedAt(LocalDateTime.now());

        groupMemberRepository.save(hostMember);

        // Invite members (nếu có)
        if (request.getMemberFirebaseUids() != null) {
            for (String firebaseUid : request.getMemberFirebaseUids()) {
                if (firebaseUid.equals(host.getFirebaseUid())) continue;

                User user = userRepository.findById(firebaseUid)
                        .orElseThrow(() -> new RuntimeException("User not found: " + firebaseUid));

                GroupMember member = new GroupMember();
                member.setGroup(group);
                member.setUser(user);
                member.setRole(GroupRole.MEMBER);
                member.setJoinedAt(LocalDateTime.now());

                groupMemberRepository.save(member);
            }
        }

        return group;
    }

}


