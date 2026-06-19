package com.wego.wego_backend.service;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.entity.Group;
import com.wego.wego_backend.entity.GroupMember;
import com.wego.wego_backend.repository.GroupMemberRepository;
import com.wego.wego_backend.repository.GroupRepository;
import com.wego.wego_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetNotificationScheduler {

    private final GroupRepository groupRepository;

    private final GroupMemberRepository groupMemberRepository;

    private final UserRepository userRepository;

    private final ExpoNotificationService expoNotificationService;

    @Scheduled(fixedRate = 60000)
    public void notifyMeet() {

        LocalDateTime now =
                LocalDateTime.now();

        List<Group> groups =
                groupRepository.findAll();

        for(Group group : groups){

            if(group.getMeetingTime()==null)
                continue;

            if(Boolean.TRUE.equals(
                    group.getMeetNotificationSent()
            ))
                continue;

            if(group.getMeetingTime()
                    .isAfter(now))
                continue;


            List<GroupMember> members =
                    groupMemberRepository
                            .findByGroup_IdAndStatus(
                                    group.getId(),
                                    GroupMemberStatus.ACCEPTED
                            );

            for(GroupMember member:members){

                userRepository
                        .findById(
                                member.getUserFirebaseUid()
                        )
                        .ifPresent(user->{

                            if(user.getExpoPushToken()!=null){

                                System.out.println(
                                        "Sending to "
                                                + user.getExpoPushToken()
                                );

                                expoNotificationService.send(

                                        user.getExpoPushToken(),

                                        "Đến giờ gặp mặt",

                                        group.getTitle()
                                                + " bắt đầu ngay bây giờ"

                                );
                            }

                        });
            }

            group.setMeetNotificationSent(true);

            groupRepository.save(group);
        }
    }
}