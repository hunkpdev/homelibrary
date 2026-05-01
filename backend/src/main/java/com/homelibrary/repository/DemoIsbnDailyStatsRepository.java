package com.homelibrary.repository;

import com.homelibrary.entity.DemoIsbnDailyStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DemoIsbnDailyStatsRepository extends JpaRepository<DemoIsbnDailyStats, UUID> {
}
