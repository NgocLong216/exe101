package com.wego.wego_backend.repository;

import com.wego.wego_backend.entity.GroupAiChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupAiChecklistRepository
        extends JpaRepository<GroupAiChecklist, UUID> {

    List<GroupAiChecklist> findByGroup_IdAndSentToAiFalseOrderByCreatedAtDesc(
            UUID groupId
    );

    void deleteByGroupId(UUID groupId);
    long countBySentToAiTrue();
}
