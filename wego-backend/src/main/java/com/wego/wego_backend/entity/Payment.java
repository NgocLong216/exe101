package com.wego.wego_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {
    public enum Status { PENDING, PAID, FAILED }

    @Id
    private String orderId;

    @Column(nullable = false)
    private String requestId;

    @Column(nullable = false)
    private String firebaseUid;

    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    private Long momoTransactionId;
    private Integer resultCode;
    private String resultMessage;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
}
