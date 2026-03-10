package com.wego.wego_backend.scheduler;

import com.wego.wego_backend.constant.GroupStatus;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.repository.GroupRepository;
import com.wego.wego_backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@EnableScheduling
@Component
public class MeetScheduler {

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private NotificationService notificationService;

    @Scheduled(fixedRate = 60000)
    public void checkMeetStart() {

        List<Group> groups =
                groupRepository.findByStatus(GroupStatus.ON_GOING);

        LocalDateTime now = LocalDateTime.now();

        for (Group group : groups) {

            if (group.getMeetingTime() != null &&
                    group.getMeetingTime().isBefore(now) &&
                    !Boolean.TRUE.equals(group.getMeetNotificationSent())) {

                notificationService.notifyMeetStart(group);

                group.setMeetNotificationSent(true);
                groupRepository.save(group);
            }
        }
    }
}
