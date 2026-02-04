package com.wego.wego_backend.entity;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.constant.GroupRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_members")
@Getter
@Setter
public class GroupMember {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    private Group group;

    @Column(name = "user_firebase_uid")
    private String userFirebaseUid;

    @Enumerated(EnumType.STRING)
    private GroupRole role;

    @Enumerated(EnumType.STRING)
    private GroupMemberStatus status;

    private LocalDateTime joinedAt;
}

