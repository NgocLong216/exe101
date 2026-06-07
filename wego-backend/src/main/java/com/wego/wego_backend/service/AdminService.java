package com.wego.wego_backend.service;

import com.cloudinary.provisioning.Account;
import com.wego.wego_backend.dto.*;
import com.wego.wego_backend.entity.User;
import com.wego.wego_backend.repository.AiQueryHistoryRepository;
import com.wego.wego_backend.repository.GroupAiChecklistRepository;
import com.wego.wego_backend.repository.ScheduleHistoryRepository;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ScheduleHistoryRepository scheduleHistoryRepository;
    private final AiQueryHistoryRepository aiQueryHistoryRepository;

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

    public QueryCountResponse getQueryCount(
            String currentUid
    ) {

        requireAdmin(currentUid);

        return new QueryCountResponse(
                aiQueryHistoryRepository.count()
        );
    }

    public List<AiQueryHistoryResponse> getAllQueries(
            String currentUid
    ) {

        requireAdmin(currentUid);

        return aiQueryHistoryRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(query -> {

                    User sender = userRepository
                            .findById(query.getSenderFirebaseUid())
                            .orElse(null);

                    return new AiQueryHistoryResponse(
                            query.getId(),
                            query.getGroupId(),
                            query.getSenderFirebaseUid(),
                            sender != null ? sender.getName() : "Unknown User",
                            query.getPrompt(),
                            query.getCreatedAt()
                    );
                })
                .toList();
    }

    public List<InteractionHeatmapResponse> getInteractionHeatmap(
            String currentUid
    ) {

        requireAdmin(currentUid);

        return aiQueryHistoryRepository
                .findAll()
                .stream()
                .collect(
                        Collectors.groupingBy(
                                q -> {

                                    int day =
                                            q.getCreatedAt()
                                                    .getDayOfWeek()
                                                    .getValue();

                                    int slot =
                                            q.getCreatedAt()
                                                    .getHour() / 3;

                                    return day + "-" + slot;
                                },
                                Collectors.counting()
                        )
                )
                .entrySet()
                .stream()
                .map(entry -> {

                    String[] parts =
                            entry.getKey().split("-");

                    return new InteractionHeatmapResponse(
                            Integer.parseInt(parts[0]),
                            Integer.parseInt(parts[1]),
                            entry.getValue()
                    );
                })
                .toList();
    }
}
