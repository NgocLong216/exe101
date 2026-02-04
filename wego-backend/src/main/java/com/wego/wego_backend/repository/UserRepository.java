package com.wego.wego_backend.repository;

import com.wego.wego_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);
    Optional<User> findByFirebaseUid(String firebaseUid);
    List<User> findByNameContainingIgnoreCase(String name);

}
