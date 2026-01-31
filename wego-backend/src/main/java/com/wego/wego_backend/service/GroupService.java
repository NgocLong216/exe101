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

    private final GroupRepository meetupRepository;
    private final GroupMemberRepository meetupMemberRepository;
    private final UserRepository userRepository;

    public Group createGroup(CreateGroupRequest request, User host) {

        // Validate time
        if (request.getMeetingTime().isBefore(LocalDateTime.now().plusMinutes(10))) {
            throw new RuntimeException("Meeting time must be at least 10 minutes later");
        }

        //  Create meetup
        Group meetup = new Group();
        meetup.setTitle(request.getTitle());
        meetup.setDescription(request.getDescription());
        meetup.setMeetingTime(request.getMeetingTime());
        meetup.setLocationLat(request.getLat());
        meetup.setLocationLng(request.getLng());
        meetup.setPlaceId(request.getPlaceId());
        meetup.setHost(host);
        meetup.setStatus(GroupStatus.WAITING);
        meetup.setCreatedAt(LocalDateTime.now());

        meetupRepository.save(meetup);

        //  Add host as member
        GroupMember hostMember = new GroupMember();
        hostMember.setGroup(meetup);
        hostMember.setUser(host);
        hostMember.setRole(GroupRole.HOST);
        hostMember.setJoinedAt(LocalDateTime.now());

        meetupMemberRepository.save(hostMember);

        //  Add invited members
        if (request.getMemberIds() != null) {
            for (Long userId : request.getMemberIds()) {
                if (userId.equals(host.getId())) continue;

                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                GroupMember member = new GroupMember();
                member.setGroup(meetup);
                member.setUser(user);
                member.setRole(GroupRole.MEMBER);
                member.setJoinedAt(LocalDateTime.now());

                meetupMemberRepository.save(member);
            }
        }

        return meetup;
    }
}

