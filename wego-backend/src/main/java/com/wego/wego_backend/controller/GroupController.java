package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.*;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.service.GroupPlaceSuggestionService;
import com.wego.wego_backend.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final GroupPlaceSuggestionService groupPlaceSuggestionService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createGroup(

            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String meetingTime,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String placeId,

            @RequestParam(required = false) MultipartFile groupPhoto,

            @RequestParam(required = false) List<String> memberFirebaseUids,

            Authentication authentication
    ) {

        String firebaseUid = authentication.getName();

        Group group = groupService.createGroup(
                title,
                description,
                meetingTime,
                lat,
                lng,
                placeId,
                groupPhoto,
                memberFirebaseUids,
                firebaseUid
        );

        return ResponseEntity.ok(group);
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyGroups(Authentication authentication) {
        String firebaseUid = authentication.getName();
        return ResponseEntity.ok(groupService.getMyGroups(firebaseUid));
    }

    @PatchMapping("/{groupId}")
    public ResponseEntity<?> updateGroup(
            @PathVariable UUID groupId,
            @RequestBody UpdateGroupRequest request,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();

        groupService.updateGroup(
                groupId,
                request,
                firebaseUid
        );

        return ResponseEntity.ok("Group updated successfully");
    }

    @PostMapping("/{groupId}/invite")
    public ResponseEntity<?> inviteMember(
            @PathVariable UUID groupId,
            @RequestBody InviteMemberRequest request,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        groupService.inviteMember(groupId, request, firebaseUid);
        return ResponseEntity.ok("Invite sent");
    }

    @GetMapping("/invitations")
    public ResponseEntity<?> getInvitations(Authentication authentication) {
        String firebaseUid = authentication.getName();
        return ResponseEntity.ok(
                groupService.getMyInvitations(firebaseUid)
        );
    }

    @PostMapping("/invitations/{memberId}/accept")
    public ResponseEntity<?> acceptInvite(
            @PathVariable UUID memberId,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        groupService.respondInvite(memberId, true, firebaseUid);
        return ResponseEntity.ok("Joined group");
    }

    @PostMapping("/invitations/{memberId}/reject")
    public ResponseEntity<?> rejectInvite(
            @PathVariable UUID memberId,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        groupService.respondInvite(memberId, false, firebaseUid);
        return ResponseEntity.ok("Invite rejected");
    }

    @GetMapping("/{groupId}/members/uids")
    public ResponseEntity<?> getGroupMemberUids(
            @PathVariable UUID groupId
    ) {
        return ResponseEntity.ok(
                groupService.getGroupMemberFirebaseUids(groupId)
        );
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<?> deleteGroup(
            @PathVariable UUID groupId,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        groupService.deleteGroup(groupId, firebaseUid);
        return ResponseEntity.ok("Group deleted");
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<?> getGroupMembers(
            @PathVariable UUID groupId
    ) {
        return ResponseEntity.ok(
                groupService.getGroupMembers(groupId)
        );
    }

    @PostMapping("/{groupId}/suggest-place")
    public ResponseEntity<?> suggestPlace(
            @PathVariable UUID groupId,
            @RequestBody SuggestPlaceRequest request
    ) {
        return ResponseEntity.ok(
                groupPlaceSuggestionService.suggest(
                        groupId,
                        request.getKeyword()
                )
        );
    }

    @DeleteMapping("/{groupId}/members/{targetUid}")
    public ResponseEntity<?> kickMember(
            @PathVariable UUID groupId,
            @PathVariable String targetUid,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        groupService.kickMember(groupId, targetUid, firebaseUid);
        return ResponseEntity.ok("Member kicked successfully");
    }

    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<?> leaveGroup(
            @PathVariable UUID groupId,
            Authentication authentication
    ) {
        String firebaseUid = authentication.getName();
        groupService.leaveGroup(groupId, firebaseUid);
        return ResponseEntity.ok("Left group successfully");
    }

    @PostMapping("/{groupId}/schedule-meet")
    public ResponseEntity<?> scheduleMeet(
            @PathVariable UUID groupId,
            @RequestBody ScheduleMeetRequest request) {

        groupService.scheduleMeet(groupId, request.getMeetingTime());
        return ResponseEntity.ok("Meet scheduled successfully");
    }
}