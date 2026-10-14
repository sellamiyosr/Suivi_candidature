package com.pfetracker.repository;

import com.pfetracker.entity.UserCv;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserCvRepository extends JpaRepository<UserCv, Long> {

    Optional<UserCv> findByUserId(Long userId);

    void deleteByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
