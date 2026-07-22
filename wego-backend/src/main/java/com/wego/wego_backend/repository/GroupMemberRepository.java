package com.wego.wego_backend.repository;

import com.wego.wego_backend.constant.GroupMemberStatus;
import com.wego.wego_backend.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    List<GroupMember> findByUserFirebaseUid(String firebaseUid);
    void deleteByUserFirebaseUid(String firebaseUid);
    boolean existsByGroupIdAndUserFirebaseUid(UUID groupId, String userFirebaseUid);
    List<GroupMember> findByUserFirebaseUidAndStatus(
            String userFirebaseUid,
            GroupMemberStatus status
    );
    void deleteByGroup_Id(UUID groupId);
    List<GroupMember> findByGroup_IdAndStatus(UUID groupId, GroupMemberStatus status);
    int countByGroup_IdAndStatus(UUID groupId, GroupMemberStatus status);
    Optional<GroupMember> findByGroup_IdAndUserFirebaseUid(UUID groupId, String userFirebaseUid);

}
