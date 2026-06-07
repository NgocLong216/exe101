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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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

    public List<ActivityResponse> getRecentActivities(
            String currentUid
    ) {

        requireAdmin(currentUid);

        List<ActivityResponse> activities = new ArrayList<>();

        // User registrations
        userRepository.findAll()
                .forEach(user ->
                        activities.add(
                                new ActivityResponse(
                                        "USER_REGISTER",
                                        user.getName() + " registered",
                                        user.getCreatedAt()
                                )
                        )
                );

        // Schedule created
        scheduleHistoryRepository.findAll()
                .forEach(schedule ->
                        activities.add(
                                new ActivityResponse(
                                        "SCHEDULE_CREATED",
                                        "Schedule created for group: "
                                                + schedule.getGroupTitle(),
                                        schedule.getCreatedAt()
                                )
                        )
                );

        // AI queries
        aiQueryHistoryRepository.findAll()
                .forEach(query -> {

                    User sender =
                            userRepository
                                    .findById(query.getSenderFirebaseUid())
                                    .orElse(null);

                    activities.add(
                            new ActivityResponse(
                                    "CHATBOT_QUERY",
                                    (sender != null
                                            ? sender.getName()
                                            : "Unknown User")
                                            + " searched: "
                                            + query.getPrompt(),
                                    query.getCreatedAt()
                            )
                    );
                });

        return activities.stream()
                .sorted(
                        Comparator.comparing(
                                ActivityResponse::getCreatedAt
                        ).reversed()
                )
                .limit(10)
                .toList();
    }

    public List<ScheduleTrendResponse> getScheduleTrend(
            String currentUid
    ) {

        requireAdmin(currentUid);

        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(29);

        Map<LocalDate, Long> counts =
                scheduleHistoryRepository.findAll()
                        .stream()
                        .filter(schedule ->
                                !schedule.getCreatedAt()
                                        .toLocalDate()
                                        .isBefore(startDate))
                        .collect(
                                Collectors.groupingBy(
                                        schedule ->
                                                schedule.getCreatedAt()
                                                        .toLocalDate(),
                                        Collectors.counting()
                                )
                        );

        List<ScheduleTrendResponse> result =
                new ArrayList<>();

        for (int i = 0; i < 30; i++) {

            LocalDate date =
                    startDate.plusDays(i);

            result.add(
                    new ScheduleTrendResponse(
                            date.toString(),
                            counts.getOrDefault(date, 0L)
                    )
            );
        }

        return result;
    }
}
