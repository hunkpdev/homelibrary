package com.homelibrary.service;

import com.homelibrary.entity.DemoIsbnDailyStats;
import com.homelibrary.exception.DemoRateLimitExceededException;
import com.homelibrary.repository.DemoIsbnDailyStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;

@Slf4j
@RequiredArgsConstructor
@Service
public class DemoIsbnRateLimitService {

    static final int SESSION_LIMIT = 5;
    static final int DAILY_LIMIT = 50;
    static final String CACHE_NAME = "isbnSessionCount";

    private final DemoIsbnDailyStatsRepository dailyStatsRepository;
    private final CacheManager cacheManager;

    @Transactional(readOnly = true)
    public void checkLimits(String jti) {
        checkSessionLimit(jti);
        checkDailyLimit();
    }

    @Transactional
    public void incrementCounters(String jti) {
        incrementSession(jti);
        incrementDaily();
    }

    private void checkSessionLimit(String jti) {
        if (getSessionCount(jti) >= SESSION_LIMIT) {
            throw new DemoRateLimitExceededException("session");
        }
    }

    private void checkDailyLimit() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int count = dailyStatsRepository.findAll().stream().findFirst()
                .filter(s -> s.getLookupDate().equals(today))
                .map(DemoIsbnDailyStats::getLookupCount)
                .orElse(0);
        if (count >= DAILY_LIMIT) {
            throw new DemoRateLimitExceededException("daily");
        }
    }

    private void incrementSession(String jti) {
        cacheManager.getCache(CACHE_NAME).put(jti, getSessionCount(jti) + 1);
    }

    private void incrementDaily() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        DemoIsbnDailyStats stats = resolveStats(today);
        stats.setLookupCount(stats.getLookupCount() + 1);
        dailyStatsRepository.save(stats);
    }

    private int getSessionCount(String jti) {
        Integer count = cacheManager.getCache(CACHE_NAME).get(jti, Integer.class);
        return count != null ? count : 0;
    }

    private DemoIsbnDailyStats resolveStats(LocalDate today) {
        return dailyStatsRepository.findAll().stream().findFirst()
                .map(stats -> {
                    if (!stats.getLookupDate().equals(today)) {
                        stats.setLookupDate(today);
                        stats.setLookupCount(0);
                    }
                    return stats;
                })
                .orElseGet(() -> {
                    DemoIsbnDailyStats s = new DemoIsbnDailyStats();
                    s.setLookupDate(today);
                    s.setLookupCount(0);
                    return s;
                });
    }
}
