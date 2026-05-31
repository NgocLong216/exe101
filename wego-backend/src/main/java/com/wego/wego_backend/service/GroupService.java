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
import org.springframework.web.multipart.MultipartFile;

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
    private final CloudinaryService cloudinaryService;
    private final NotificationService notificationService;

    public Group createGroup(
            String title,
            String description,
            String meetingTime,
            Double lat,
            Double lng,
            String placeId,
            MultipartFile groupPhoto,
            List<String> memberFirebaseUids,
            String hostUid
    ) {

        User host = userRepository.findById(hostUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Group group = new Group();

        group.setTitle(title);
        group.setDescription(description);
        group.setLocationLat(lat);
        group.setLocationLng(lng);
        group.setPlaceId(placeId);
        group.setHostFirebaseUid(hostUid);
        group.setStatus(GroupStatus.WAITING);
        group.setCreatedAt(LocalDateTime.now());

        // parse meetingTime nếu có
        if (meetingTime != null) {
            group.setMeetingTime(LocalDateTime.parse(meetingTime));
        }

        // Upload ảnh lên Cloudinary
        if (groupPhoto != null && !groupPhoto.isEmpty()) {

            String photoUrl = cloudinaryService.uploadFile(groupPhoto);
            group.setGroupPhoto(photoUrl);

        } else {

            group.setGroupPhoto(
                    "https://ui-avatars.com/api/?name=" + title
            );
        }

        groupRepository.save(group);

        // Host member
        GroupMember hostMember = new GroupMember();
        hostMember.setGroup(group);
        hostMember.setUserFirebaseUid(hostUid);
        hostMember.setRole(GroupRole.HOST);
        hostMember.setStatus(GroupMemberStatus.ACCEPTED);
        hostMember.setJoinedAt(LocalDateTime.now());

        groupMemberRepository.save(hostMember);

        // Invite members
        if (memberFirebaseUids != null) {
            for (String firebaseUid : memberFirebaseUids) {

                if (firebaseUid.equals(hostUid)) continue;

                User user = userRepository.findById(firebaseUid)
                        .orElseThrow(() ->
                                new RuntimeException("User not found: " + firebaseUid)
                        );

                GroupMember member = new GroupMember();
                member.setGroup(group);
                member.setUserFirebaseUid(user.getFirebaseUid());
                member.setRole(GroupRole.MEMBER);
                member.setStatus(GroupMemberStatus.INVITED);
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
                groupMemberRepository.findByUserFirebaseUidAndStatus(
                        firebaseUid,
                        GroupMemberStatus.ACCEPTED
                );

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
                            g.getHostFirebaseUid().equals(firebaseUid),
                            g.getGroupPhoto()
                    );
                })
                .toList();
    }

    @Transactional
    public void updateGroup(
            UUID groupId,
            UpdateGroupRequest request,
            String currentUid
    ) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // chỉ host được sửa
        if (!group.getHostFirebaseUid().equals(currentUid)) {
            throw new RuntimeException("Only host can update group");
        }

        if (request.getTitle() != null) {
            group.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            group.setDescription(request.getDescription());
        }

        if (request.getGroupPhoto() != null) {
            group.setGroupPhoto(request.getGroupPhoto());
        }

        groupRepository.save(group);
    }

    public void inviteMember(UUID groupId, InviteMemberRequest request, String hostUid) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (!group.getHostFirebaseUid().equals(hostUid)) {
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


    public void respondInvite(UUID memberId, boolean accept, String firebaseUid) {

        GroupMember member = groupMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Invite not found"));

        if (!member.getUserFirebaseUid().equals(firebaseUid)) {
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
    public void deleteGroup(UUID groupId, String firebaseUid) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // chỉ host mới được xoá
        if (!group.getHostFirebaseUid().equals(firebaseUid)) {
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
                            user != null ? user.getAvatar() : null,
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

    public void leaveGroup(UUID groupId, String currentUid) {

        System.out.println("Current UID: " + currentUid);
        System.out.println("Group ID: " + groupId);

        List<GroupMember> members = groupMemberRepository.findAll();
        members.forEach(m ->
                System.out.println(
                        m.getGroup().getId() + " | " +
                                m.getUserFirebaseUid() + " | " +
                                m.getStatus()
                )
        );

        GroupMember member = groupMemberRepository
                .findByGroup_IdAndUserFirebaseUid(groupId, currentUid)
                .orElseThrow(() -> new RuntimeException("Not a member"));

        if (member.getRole().equals(GroupRole.HOST)) {
            throw new RuntimeException("Host cannot leave group");
        }

        if (!member.getStatus().equals(GroupMemberStatus.ACCEPTED)) {
            throw new RuntimeException("Only accepted members can leave");
        }

        member.setStatus(GroupMemberStatus.LEFT);
        groupMemberRepository.save(member);
    }

    public void scheduleMeet(UUID groupId, LocalDateTime meetingTime) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (meetingTime.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Meeting time cannot be in the past");
        }

        group.setMeetingTime(meetingTime);
        group.setStatus(GroupStatus.ON_GOING);

        groupRepository.save(group);
    }

}


