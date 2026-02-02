package com.wego.wego_backend.repository;

import com.wego.wego_backend.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    List<GroupMember> findByUserFirebaseUid(String firebaseUid);

}
