package com.wego.wego_backend.service;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.constant.GroupRole;
import com.wego.wego_backend.constant.GroupStatus;
import com.wego.wego_backend.dto.*;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.entity.GroupMember;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.GroupMemberRepository;
import com.wego.wego_backend.repository.GroupRepository;
import com.wego.wego_backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

        group.setHostFirebaseUid(host.getFirebaseUid());
        group.setStatus(GroupStatus.WAITING);
        group.setCreatedAt(LocalDateTime.now());

        groupRepository.save(group);

        // Add host as member
        GroupMember hostMember = new GroupMember();
        hostMember.setGroup(group);
        hostMember.setUserFirebaseUid(host.getFirebaseUid());
        hostMember.setRole(GroupRole.HOST);
        hostMember.setStatus(GroupMemberStatus.ACCEPTED);
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
                member.setUserFirebaseUid(user.getFirebaseUid());
                member.setRole(GroupRole.MEMBER);
                member.setJoinedAt(LocalDateTime.now());

                groupMemberRepository.save(member);
            }
        }

        return group;
    }

    public List<MyGroupResponse> getMyGroups(String firebaseUid) {

        System.out.println(" Firebase UID from token = " + firebaseUid);

        // 1. Group mà user là member
        List<GroupMember> memberships =
                groupMemberRepository.findByUserFirebaseUid(firebaseUid);

        System.out.println(" Membership count = " + memberships.size());

        Map<UUID, Group> groupMap = new HashMap<>();

        for (GroupMember gm : memberships) {
            groupMap.put(gm.getGroup().getId(), gm.getGroup());
        }

        // 2. Group mà user là host
        List<Group> hostGroups =
                groupRepository.findByHostFirebaseUid(firebaseUid);

        System.out.println(" Host group count = " + hostGroups.size());

        for (Group g : hostGroups) {
            groupMap.put(g.getId(), g);
        }

        // 3. Convert sang DTO
        return groupMap.values().stream()
                .map(g -> {

                    int memberCount =
                            groupMemberRepository.countByGroup_IdAndStatus(
                                    g.getId(),
                                    GroupMemberStatus.ACCEPTED
                            );

                    return new MyGroupResponse(
                            g.getId(),
                            g.getTitle(),
                            g.getDescription(),
                            g.getLocationLat(),
                            g.getLocationLng(),
                            g.getMeetingTime(),
                            g.getStatus(),
                            memberCount,
                            g.getHostFirebaseUid().equals(firebaseUid)
                    );
                })
                .toList();


    }

    public void inviteMember(UUID groupId, InviteMemberRequest request, User host) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (!group.getHostFirebaseUid().equals(host.getFirebaseUid())) {
            throw new RuntimeException("Only host can invite");
        }

        boolean exists = groupMemberRepository
                .existsByGroupIdAndUserFirebaseUid(groupId, request.getFirebaseUid());

        if (exists) {
            throw new RuntimeException("User already invited or in group");
        }

        GroupMember invite = new GroupMember();
        invite.setGroup(group);
        invite.setUserFirebaseUid(request.getFirebaseUid());
        invite.setRole(GroupRole.MEMBER);
        invite.setStatus(GroupMemberStatus.INVITED);

        groupMemberRepository.save(invite);
    }

    public List<InvitationResponse> getMyInvitations(String firebaseUid) {
        return groupMemberRepository
                .findByUserFirebaseUidAndStatus(firebaseUid, GroupMemberStatus.INVITED)
                .stream()
                .map(m -> new InvitationResponse(
                        m.getId(),
                        m.getGroup().getId(),
                        m.getGroup().getTitle()
                ))
                .toList();
    }


    public void respondInvite(UUID memberId, boolean accept, User user) {

        GroupMember member = groupMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Invite not found"));

        if (!member.getUserFirebaseUid().equals(user.getFirebaseUid())) {
            throw new RuntimeException("Forbidden");
        }

        if (accept) {
            member.setStatus(GroupMemberStatus.ACCEPTED);
            member.setJoinedAt(LocalDateTime.now());
        } else {
            member.setStatus(GroupMemberStatus.REJECTED);
        }

        groupMemberRepository.save(member);
    }

    public List<String> getGroupMemberFirebaseUids(UUID groupId) {

        return groupMemberRepository
                .findByGroupIdAndStatus(groupId, GroupMemberStatus.ACCEPTED)
                .stream()
                .map(GroupMember::getUserFirebaseUid)
                .toList();
    }

    @Transactional
    public void deleteGroup(UUID groupId, User currentUser) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // chỉ host mới được xoá
        if (!group.getHostFirebaseUid().equals(currentUser.getFirebaseUid())) {
            throw new RuntimeException("Only host can delete group");
        }

        // 1. xoá member trước
        groupMemberRepository.deleteByGroup_Id(groupId);

        // 2. xoá group
        groupRepository.delete(group);
    }

    public List<GroupMemberResponse> getGroupMembers(UUID groupId) {

        List<GroupMember> members =
                groupMemberRepository.findByGroup_IdAndStatus(
                        groupId,
                        GroupMemberStatus.ACCEPTED
                );

        return members.stream()
                .map(m -> {
                    User user = userRepository.findById(m.getUserFirebaseUid())
                            .orElse(null);

                    return new GroupMemberResponse(
                            m.getUserFirebaseUid(),
                            user != null ? user.getName() : "Unknown",
                            m.getRole() == GroupRole.HOST
                    );
                })
                .toList();
    }

    @Transactional
    public void kickMember(UUID groupId, String targetUid, String currentUid) {

        // Kiểm tra người thực hiện có trong group không
        GroupMember currentMember = groupMemberRepository
                .findByGroup_IdAndUserFirebaseUid(groupId, currentUid)
                .orElseThrow(() -> new RuntimeException("You are not in this group"));

        // Chỉ LEADER mới được kick
        if (currentMember.getRole() != GroupRole.HOST) {
            throw new RuntimeException("Only leader can kick members");
        }

        // Tìm member cần kick
        GroupMember targetMember = groupMemberRepository
                .findByGroup_IdAndUserFirebaseUid(groupId, targetUid)
                .orElseThrow(() -> new RuntimeException("User not found in group"));

        // Không cho leader tự kick mình
        if (targetUid.equals(currentUid)) {
            throw new RuntimeException("Leader cannot kick themselves");
        }

        // Không kick leader khác
        if (targetMember.getRole() == GroupRole.HOST) {
            throw new RuntimeException("Cannot kick another leader");
        }

        // Chỉ kick member đã ACCEPTED
        if (targetMember.getStatus() != GroupMemberStatus.ACCEPTED) {
            throw new RuntimeException("Cannot kick non-accepted member");
        }

        // Soft delete
         targetMember.setStatus(GroupMemberStatus.KICKED);
         groupMemberRepository.save(targetMember);
    }

}


