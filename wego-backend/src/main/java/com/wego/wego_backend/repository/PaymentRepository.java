package com.wego.wego_backend.repository;

import com.wego.wego_backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, String> {
    void deleteByFirebaseUid(String firebaseUid);
}
