package com.wego.wego_backend.repository;

import com.wego.wego_backend.constant.GroupStatus;
import com.wego.wego_backend.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {
    List<Group> findByHostFirebaseUid(String firebaseUid);
    List<Group> findByStatus(GroupStatus status);
    List<Group> findByHostFirebaseUidAndStatus(
            String hostFirebaseUid,
            GroupStatus status
    );
}

