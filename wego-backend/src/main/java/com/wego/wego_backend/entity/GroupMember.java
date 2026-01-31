package com.wego.wego_backend.entity;

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

    @ManyToOne
    private User user;

    @Enumerated(EnumType.STRING)
    private GroupRole role;

    private LocalDateTime joinedAt;
}

