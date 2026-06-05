package com.wego.wego_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_ai_checklist")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupAiChecklist {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    private String senderFirebaseUid;

    @Column(columnDefinition = "TEXT")
    private String content;

    private LocalDateTime createdAt;

    private boolean sentToAi;
}
