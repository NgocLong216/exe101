package com.wego.wego_backend.service;

import com.google.firebase.database.FirebaseDatabase;
import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.constant.GroupRole;
import com.wego.wego_backend.constant.GroupStatus;
import com.wego.wego_backend.dto.*;
import com.wego.wego_backend.entity.*;
import com.wego.wego_backend.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final NotificationService notificationService;
    private final FirebaseDatabase firebaseDatabase;
    private final GroupAiChecklistRepository aiChecklistRepository;
    private final AiPlaceService aiPlaceService;
    private final ScheduleHistoryRepository scheduleHistoryRepository;
    private final AiQueryHistoryRepository aiQueryHistoryRepository;
    private final FirebaseRealtimeService firebaseRealtimeService;
    private final GroupAiChecklistRepository groupAiChecklistRepository;

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

        firebaseRealtimeService.addMember(
                group.getId(),
                hostUid
        );

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

                firebaseRealtimeService.addMember(
                        group.getId(),
                        user.getFirebaseUid()
                );
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

    public void inviteMember(
            UUID groupId,
            InviteMemberRequest request,
            String hostUid
    ) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (!group.getHostFirebaseUid().equals(hostUid)) {
            throw new RuntimeException("Only host can invite");
        }

        Optional<GroupMember> existing =
                groupMemberRepository
                        .findByGroup_IdAndUserFirebaseUid(
                                groupId,
                                request.getFirebaseUid()
                        );

        if (existing.isPresent()) {

            GroupMember member = existing.get();

            if (
                    member.getStatus() == GroupMemberStatus.ACCEPTED ||
                            member.getStatus() == GroupMemberStatus.INVITED
            ) {
                throw new RuntimeException(
                        "User already in group"
                );
            }

            member.setStatus(GroupMemberStatus.INVITED);
            member.setRole(GroupRole.MEMBER);

            groupMemberRepository.save(member);

            return;
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

            firebaseRealtimeService.addMember(
                    member.getGroup().getId(),
                    firebaseUid
            );
        } else {
            member.setStatus(GroupMemberStatus.REJECTED);
        }

        groupMemberRepository.save(member);
    }

    public List<String> getGroupMemberFirebaseUids(UUID groupId) {

        return groupMemberRepository
                .findByGroup_IdAndStatus(groupId, GroupMemberStatus.ACCEPTED)
                .stream()
                .map(GroupMember::getUserFirebaseUid)
                .toList();
    }

    @Transactional
    public void deleteGroup(UUID groupId, String firebaseUid) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (!group.getHostFirebaseUid().equals(firebaseUid)) {
            throw new RuntimeException("Only host can delete group");
        }

        firebaseDatabase
                .getReference("group_chats")
                .child(groupId.toString())
                .removeValueAsync();

        groupAiChecklistRepository.deleteByGroupId(groupId);

        groupMemberRepository.deleteByGroup_Id(groupId);

        groupRepository.delete(group);

        firebaseRealtimeService.deleteGroup(groupId);
    }

    public List<GroupMemberResponse> getGroupMembers(UUID groupId, String currentUid) {

        List<GroupMember> members =
                groupMemberRepository.findByGroup_IdAndStatus(
                        groupId,
                        GroupMemberStatus.ACCEPTED
                );

        GroupMember currentMember = groupMemberRepository
                .findByGroup_IdAndUserFirebaseUid(
                        groupId,
                        currentUid
                )
                .orElseThrow(() ->
                        new RuntimeException("Not member of group"));

        boolean isCurrentHost =
                currentMember.getRole() == GroupRole.HOST;

        return members.stream()
                .map(m -> {
                    User user = userRepository.findById(m.getUserFirebaseUid())
                            .orElse(null);

                    boolean isHost =
                            m.getRole() == GroupRole.HOST;

                    boolean canKick =
                            isCurrentHost
                                    && !isHost
                                    && !m.getUserFirebaseUid()
                                    .equals(currentUid);

                    return new GroupMemberResponse(
                            m.getUserFirebaseUid(),
                            user != null ? user.getName() : "Unknown",
                            user != null ? user.getAvatar() : null,
                            isHost,
                            canKick
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

        firebaseRealtimeService.removeMember(
                groupId,
                targetUid
        );
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

        firebaseRealtimeService.removeMember(
                groupId,
                currentUid
        );
    }

    public void scheduleMeet(
            UUID groupId,
            LocalDateTime meetingTime,
            Double lat,
            Double lng,
            String placeId
    ) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (meetingTime.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Meeting time cannot be in the past");
        }

        group.setMeetingTime(meetingTime);

        group.setLocationLat(lat);
        group.setLocationLng(lng);
        group.setPlaceId(placeId);

        group.setStatus(GroupStatus.ON_GOING);

        groupRepository.save(group);

        ScheduleHistory history = new ScheduleHistory();

        history.setGroupId(group.getId());
        history.setHostFirebaseUid(group.getHostFirebaseUid());
        history.setGroupTitle(group.getTitle());
        history.setMeetingTime(meetingTime);
        history.setCreatedAt(LocalDateTime.now());

        scheduleHistoryRepository.save(history);
    }

    public List<MeetingScheduleResponse> getMyMeetings(String firebaseUid) {

        Map<UUID, Group> meetingMap = new HashMap<>();

        // Group user tham gia
        List<GroupMember> memberships =
                groupMemberRepository.findByUserFirebaseUidAndStatus(
                        firebaseUid,
                        GroupMemberStatus.ACCEPTED
                );

        for (GroupMember gm : memberships) {

            Group group = gm.getGroup();

            if (group.getStatus() != GroupStatus.WAITING) {
                meetingMap.put(group.getId(), group);
            }
        }

        // Group user làm host
        List<Group> hostGroups =
                groupRepository.findByHostFirebaseUid(firebaseUid);

        for (Group group : hostGroups) {

            if (group.getStatus() != GroupStatus.WAITING) {
                meetingMap.put(group.getId(), group);
            }
        }

        return meetingMap.values().stream()
                .map(group -> {

                    List<GroupMember> members =
                            groupMemberRepository.findByGroup_IdAndStatus(
                                    group.getId(),
                                    GroupMemberStatus.ACCEPTED
                            );

                    List<String> avatars =
                            members.stream()
                                    .map(m -> userRepository
                                            .findById(m.getUserFirebaseUid())
                                            .orElse(null))
                                    .filter(Objects::nonNull)
                                    .map(User::getAvatar)
                                    .limit(3)
                                    .toList();

                    return new MeetingScheduleResponse(
                            group.getId(),
                            group.getTitle(),
                            group.getDescription(),
                            group.getMeetingTime(),
                            group.getLocationLat(),
                            group.getLocationLng(),
                            group.getPlaceId(),
                            group.getGroupPhoto(),
                            members.size(),
                            avatars,
                            group.getStatus(),
                            group.getHostFirebaseUid().equals(firebaseUid)
                    );
                })
                .sorted(
                        Comparator.comparing(
                                MeetingScheduleResponse::getMeetingTime
                        )
                )
                .toList();
    }

    public List<AiChecklistResponse> getAiChecklist(
            UUID groupId
    ) {

        return aiChecklistRepository
                .findByGroup_IdAndSentToAiFalseOrderByCreatedAtDesc(groupId)
                .stream()
                .map(item ->
                        new AiChecklistResponse(
                                item.getId(),
                                item.getContent(),
                                item.getCreatedAt()
                        )
                )
                .toList();
    }

    public void createAiChecklist(
            UUID groupId,
            String firebaseUid,
            CreateAiChecklistRequest request
    ) {

        Group group = groupRepository
                .findById(groupId)
                .orElseThrow();

        GroupAiChecklist item =
                GroupAiChecklist.builder()
                        .group(group)
                        .senderFirebaseUid(firebaseUid)
                        .content(request.content())
                        .createdAt(LocalDateTime.now())
                        .sentToAi(false)
                        .build();

        aiChecklistRepository.save(item);
    }

    @Transactional
    public AiChatResponse sendChecklistToAi(UUID groupId) {

        List<GroupAiChecklist> checklist =
                aiChecklistRepository
                        .findByGroup_IdAndSentToAiFalseOrderByCreatedAtDesc(groupId);

        if (checklist.isEmpty()) {
            throw new RuntimeException("Checklist is empty");
        }

        String prompt =
                IntStream.range(0, checklist.size())
                        .mapToObj(i ->
                                (i + 1) + ". " +
                                        checklist.get(i).getContent()
                        )
                        .collect(Collectors.joining("\n"));

        long start = System.currentTimeMillis();

        AiChatResponse response =
                aiPlaceService.chat(
                        groupId.toString(),
                        prompt
                );

        long end = System.currentTimeMillis();

        long responseTime =
                end - start;

        // lưu lịch sử query
        AiQueryHistory history = new AiQueryHistory();

        history.setGroupId(groupId);
        history.setSenderFirebaseUid(
                checklist.getFirst().getSenderFirebaseUid()
        );
        history.setPrompt(prompt);
        history.setResponseTimeMs(
                responseTime
        );
        history.setCreatedAt(LocalDateTime.now());

        aiQueryHistoryRepository.save(history);


        // Đánh dấu đã gửi AI
        checklist.forEach(item ->
                item.setSentToAi(true)
        );

        aiChecklistRepository.saveAll(checklist);

        return response;
    }

    @Transactional
    public void completeMeet(UUID groupId, String currentUid) {

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // chỉ host được kết thúc
        if (!group.getHostFirebaseUid().equals(currentUid)) {
            throw new RuntimeException("Only host can complete meeting");
        }

        group.setStatus(GroupStatus.FINISHED);

        groupRepository.save(group);
    }

}


