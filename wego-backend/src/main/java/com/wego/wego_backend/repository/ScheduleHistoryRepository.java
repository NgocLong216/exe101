package com.wego.wego_backend.repository;

import com.wego.wego_backend.entity.ScheduleHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScheduleHistoryRepository
        extends JpaRepository<ScheduleHistory, UUID> {

    long count();
    List<ScheduleHistory> findAllByOrderByCreatedAtDesc();
}