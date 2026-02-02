package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.CreateGroupRequest;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

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

}

