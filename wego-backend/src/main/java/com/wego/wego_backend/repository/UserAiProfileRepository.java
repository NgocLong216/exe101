package com.wego.wego_backend.repository;

import com.wego.wego_backend.entity.UserAiProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAiProfileRepository
        extends JpaRepository<UserAiProfile, String> {
}
