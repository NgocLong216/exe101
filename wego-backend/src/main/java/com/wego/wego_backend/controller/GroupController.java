package com.wego.wego_backend.controller;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.dto.CreateGroupRequest;
import com.wego.wego_backend.dto.InviteMemberRequest;
import com.wego.wego_backend.dto.SuggestPlaceRequest;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.service.GroupPlaceSuggestionService;
import com.wego.wego_backend.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    private final GroupPlaceSuggestionService groupPlaceSuggestionService;

    @PostMapping
    public ResponseEntity<?> createGroup(
            @RequestBody @Valid CreateGroupRequest request,
            @AuthenticationPrincipal User user
    ) {
        Group group = groupService.createGroup(request, user);
        return ResponseEntity.ok(group);
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyGroups(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(groupService.getMyGroups(user.getFirebaseUid()));
    }

    @PostMapping("/{groupId}/invite")
    public ResponseEntity<?> inviteMember(
            @PathVariable UUID groupId,
            @RequestBody InviteMemberRequest request,
            @AuthenticationPrincipal User user
    ) {
        groupService.inviteMember(groupId, request, user);
        return ResponseEntity.ok("Invite sent");
    }

    @GetMapping("/invitations")
    public ResponseEntity<?> getInvitations(
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                groupService.getMyInvitations(user.getFirebaseUid())
        );
    }


    @PostMapping("/invitations/{memberId}/accept")
    public ResponseEntity<?> acceptInvite(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal User user
    ) {
        groupService.respondInvite(memberId, true, user);
        return ResponseEntity.ok("Joined group");
    }

    @PostMapping("/invitations/{memberId}/reject")
    public ResponseEntity<?> rejectInvite(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal User user
    ) {
        groupService.respondInvite(memberId, false, user);
        return ResponseEntity.ok("Invite rejected");
    }

    @GetMapping("/{groupId}/members/uids")
    public ResponseEntity<?> getGroupMemberUids(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(
                groupService.getGroupMemberFirebaseUids(groupId)
        );
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<?> deleteGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User user
    ) {
        groupService.deleteGroup(groupId, user);
        return ResponseEntity.ok("Group deleted");
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<?> getGroupMembers(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal User user
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


}

