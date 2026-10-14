package com.pfetracker.repository;

import com.pfetracker.entity.Application;
import com.pfetracker.entity.ApplicationStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    List<Application> findByUserIdOrderByApplicationDateDescCreatedAtDesc(Long userId);

    Optional<Application> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, ApplicationStatus status);

    @Query("""
            SELECT a FROM Application a
            WHERE a.user.id = :userId
              AND (
                    (a.followUp1Done = false AND a.followUp1Date IS NOT NULL AND a.followUp1Date <= :today)
                 OR (a.followUp1Done = true AND a.followUp2Done = false
                     AND a.followUp2Date IS NOT NULL AND a.followUp2Date <= :today)
              )
            ORDER BY a.followUp1Date ASC, a.followUp2Date ASC
            """)
    List<Application> findFollowUpsDue(@Param("userId") Long userId, @Param("today") LocalDate today);

    @Query("""
            SELECT a FROM Application a JOIN FETCH a.user
            WHERE (
                    (a.followUp1Done = false AND a.followUp1Date IS NOT NULL AND a.followUp1Date <= :today
                     AND a.followUp1ReminderSent = false)
                 OR (a.followUp1Done = true AND a.followUp2Done = false
                     AND a.followUp2Date IS NOT NULL AND a.followUp2Date <= :today
                     AND a.followUp2ReminderSent = false)
              )
            ORDER BY a.user.id ASC, a.followUp1Date ASC, a.followUp2Date ASC
            """)
    List<Application> findFollowUpsDueForReminder(@Param("today") LocalDate today);

    @Query("""
            SELECT a.status, COUNT(a) FROM Application a
            WHERE a.user.id = :userId
            GROUP BY a.status
            """)
    List<Object[]> countGroupedByStatus(@Param("userId") Long userId);

    @Query("""
            SELECT COALESCE(a.platform, 'Non précisé'), COUNT(a) FROM Application a
            WHERE a.user.id = :userId
            GROUP BY a.platform
            """)
    List<Object[]> countGroupedByPlatform(@Param("userId") Long userId);

    @Query(value = """
            SELECT DATE_FORMAT(COALESCE(a.application_date, a.created_at), '%Y-%m') AS month_key, COUNT(*)
            FROM applications a
            WHERE a.user_id = :userId
            GROUP BY month_key
            ORDER BY month_key
            """, nativeQuery = true)
    List<Object[]> countGroupedByMonth(@Param("userId") Long userId);
}
