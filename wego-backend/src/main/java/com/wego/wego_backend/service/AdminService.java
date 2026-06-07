package com.wego.wego_backend.service;

import com.cloudinary.provisioning.Account;
import com.wego.wego_backend.dto.ScheduleCountResponse;
import com.wego.wego_backend.dto.ScheduleHistoryResponse;
import com.wego.wego_backend.dto.UserCountResponse;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.ScheduleHistoryRepository;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ScheduleHistoryRepository scheduleHistoryRepository;

    public void requireAdmin(String firebaseUid) {

        User user = userRepository.findById(firebaseUid)
                .orElseThrow();

        if (!"ADMIN".equals(user.getRole().getName())) {
            throw new RuntimeException("Access denied");
        }
    }

    public List<User> getAllUsers(String currentUid) {

        requireAdmin(currentUid);

        return userRepository.findAll();
    }

    public UserCountResponse getUserCount(String currentUid) {

        requireAdmin(currentUid);

        long totalUsers = userRepository.count();

        return new UserCountResponse(totalUsers);
    }

    public ScheduleCountResponse getScheduleCount(
            String currentUid
    ) {

        requireAdmin(currentUid);

        return new ScheduleCountResponse(
                scheduleHistoryRepository.count()
        );
    }

    public List<ScheduleHistoryResponse> getAllSchedules(
            String currentUid
    ) {
        requireAdmin(currentUid);

        return scheduleHistoryRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(schedule -> {

                    User host = userRepository
                            .findById(schedule.getHostFirebaseUid())
                            .orElse(null);

                    return new ScheduleHistoryResponse(
                            schedule.getId(),
                            schedule.getGroupId(),
                            schedule.getGroupTitle(),
                            schedule.getHostFirebaseUid(),
                            host != null ? host.getName() : "Unknown User",
                            schedule.getMeetingTime(),
                            schedule.getCreatedAt()
                    );
                })
                .toList();
    }
}
