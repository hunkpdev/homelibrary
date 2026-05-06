package com.homelibrary.service;

import com.homelibrary.entity.DemoIsbnDailyStats;
import com.homelibrary.exception.DemoRateLimitExceededException;
import com.homelibrary.repository.DemoIsbnDailyStatsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DemoIsbnRateLimitServiceTest {

    @Mock
    private DemoIsbnDailyStatsRepository dailyStatsRepository;

    @Mock
    private CacheManager cacheManager;

    @Mock
    private Cache cache;

    private DemoIsbnRateLimitService service;

    private static final String JTI = "test-jti-value";
    private static final LocalDate TODAY = LocalDate.now(ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        when(cacheManager.getCache(DemoIsbnRateLimitService.CACHE_NAME)).thenReturn(cache);
        service = new DemoIsbnRateLimitService(dailyStatsRepository, cacheManager);
    }

    // --- checkLimits ---

    @Test
    void checkLimits_sessionLimitReached_throwsAndDoesNotTouchDb() {
        when(cache.get(JTI, Integer.class)).thenReturn(DemoIsbnRateLimitService.SESSION_LIMIT);

        assertThatThrownBy(() -> service.checkLimits(JTI))
                .isInstanceOf(DemoRateLimitExceededException.class);

        verify(dailyStatsRepository, never()).findSingleton();
    }

    @Test
    void checkLimits_dailyLimitReached_throws() {
        when(cache.get(JTI, Integer.class)).thenReturn(null);
        when(dailyStatsRepository.findSingleton())
                .thenReturn(Optional.of(statsWithCount(TODAY, DemoIsbnRateLimitService.DAILY_LIMIT)));

        assertThatThrownBy(() -> service.checkLimits(JTI))
                .isInstanceOf(DemoRateLimitExceededException.class);
    }

    @Test
    void checkLimits_bothLimitsOk_doesNotThrow() {
        when(cache.get(JTI, Integer.class)).thenReturn(2);
        when(dailyStatsRepository.findSingleton()).thenReturn(Optional.of(statsWithCount(TODAY, 10)));

        service.checkLimits(JTI);
    }

    @Test
    void checkLimits_differentDay_treatedAsZeroCount_doesNotThrow() {
        when(cache.get(JTI, Integer.class)).thenReturn(null);
        when(dailyStatsRepository.findSingleton())
                .thenReturn(Optional.of(statsWithCount(TODAY.minusDays(1), DemoIsbnRateLimitService.DAILY_LIMIT)));

        service.checkLimits(JTI);
    }

    // --- incrementCounters ---

    @Test
    void incrementCounters_incrementsSessionAndDaily() {
        when(cache.get(JTI, Integer.class)).thenReturn(2);
        DemoIsbnDailyStats stats = statsWithCount(TODAY, 10);
        when(dailyStatsRepository.findSingleton()).thenReturn(Optional.of(stats));
        when(dailyStatsRepository.save(any())).thenReturn(stats);

        service.incrementCounters(JTI);

        verify(cache).put(JTI, 3);
        assertThat(stats.getLookupCount()).isEqualTo(11);
        verify(dailyStatsRepository).save(stats);
    }

    @Test
    void incrementCounters_firstSession_setsSessionCountToOne() {
        when(cache.get(JTI, Integer.class)).thenReturn(null);
        when(dailyStatsRepository.findSingleton()).thenReturn(Optional.of(statsWithCount(TODAY, 0)));
        when(dailyStatsRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.incrementCounters(JTI);

        verify(cache).put(JTI, 1);
    }

    @Test
    void incrementCounters_differentDay_resetsCount() {
        when(cache.get(JTI, Integer.class)).thenReturn(null);
        DemoIsbnDailyStats stats = statsWithCount(TODAY.minusDays(1), 49);
        when(dailyStatsRepository.findSingleton()).thenReturn(Optional.of(stats));
        when(dailyStatsRepository.save(any())).thenReturn(stats);

        service.incrementCounters(JTI);

        assertThat(stats.getLookupDate()).isEqualTo(TODAY);
        assertThat(stats.getLookupCount()).isEqualTo(1);
    }

    @Test
    void incrementCounters_noStatsRow_createsNewRow() {
        when(cache.get(JTI, Integer.class)).thenReturn(null);
        when(dailyStatsRepository.findSingleton()).thenReturn(Optional.empty());
        ArgumentCaptor<DemoIsbnDailyStats> captor = ArgumentCaptor.forClass(DemoIsbnDailyStats.class);
        when(dailyStatsRepository.save(captor.capture())).thenAnswer(i -> i.getArgument(0));

        service.incrementCounters(JTI);

        DemoIsbnDailyStats saved = captor.getValue();
        assertThat(saved.getLookupDate()).isEqualTo(TODAY);
        assertThat(saved.getLookupCount()).isEqualTo(1);
    }

    private DemoIsbnDailyStats statsWithCount(LocalDate date, int count) {
        DemoIsbnDailyStats stats = new DemoIsbnDailyStats();
        stats.setLookupDate(date);
        stats.setLookupCount(count);
        return stats;
    }
}
