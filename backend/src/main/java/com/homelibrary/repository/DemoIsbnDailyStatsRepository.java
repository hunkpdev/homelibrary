package com.homelibrary.repository;

import com.homelibrary.entity.DemoIsbnDailyStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface DemoIsbnDailyStatsRepository extends JpaRepository<DemoIsbnDailyStats, UUID> {

    @Query("SELECT s FROM DemoIsbnDailyStats s")
    Optional<DemoIsbnDailyStats> findSingleton();
}
