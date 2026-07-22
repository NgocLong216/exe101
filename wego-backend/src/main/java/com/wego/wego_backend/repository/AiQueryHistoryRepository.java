package com.wego.wego_backend.repository;

import com.wego.wego_backend.entity.AiQueryHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiQueryHistoryRepository
        extends JpaRepository<AiQueryHistory, UUID> {
    List<AiQueryHistory> findAllByOrderByCreatedAtDesc();
    void deleteBySenderFirebaseUid(String firebaseUid);
}
