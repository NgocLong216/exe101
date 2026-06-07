package com.wego.wego_backend.controller;

import com.wego.wego_backend.dto.ScheduleCountResponse;
import com.wego.wego_backend.dto.ScheduleHistoryResponse;
import com.wego.wego_backend.dto.UserCountResponse;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @Autowired
    private AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers(
            Authentication auth
    ) {
        return ResponseEntity.ok(
                adminService.getAllUsers(auth.getName())
        );
    }

    @GetMapping("/users/count")
    public ResponseEntity<UserCountResponse> getUserCount(
            Authentication authentication
    ) {

        return ResponseEntity.ok(
                adminService.getUserCount(
                        authentication.getName()
                )
        );
    }

    @GetMapping("/schedules/count")
    public ResponseEntity<ScheduleCountResponse> getScheduleCount(
            Authentication authentication
    ) {

        return ResponseEntity.ok(
                adminService.getScheduleCount(
                        authentication.getName()
                )
        );
    }

    @GetMapping("/schedules")
    public ResponseEntity<List<ScheduleHistoryResponse>> getSchedules(
            Authentication authentication
    ) {

        return ResponseEntity.ok(
                adminService.getAllSchedules(
                        authentication.getName()
                )
        );
    }
}
