package com.homelibrary.service;

import com.homelibrary.dto.IsbnLookupResponse;
import com.homelibrary.entity.User;
import com.homelibrary.exception.InvalidIsbnException;
import com.homelibrary.isbn.OszkNektarClient;
import com.homelibrary.model.IsbnSource;
import com.homelibrary.model.Role;
import com.homelibrary.util.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IsbnLookupServiceTest {

    @Mock
    private OszkNektarClient oszkNektarClient;

    @Mock
    private DemoIsbnRateLimitService rateLimitService;

    @Mock
    private JwtUtil jwtUtil;

    private IsbnLookupService service;

    private static final String VALID_ISBN_RAW = "978-963-405-848-9";
    private static final String VALID_ISBN_NORMALIZED = "9789634058489";
    private static final String JTI = "test-jti";

    @BeforeEach
    void setUp() {
        service = new IsbnLookupService(oszkNektarClient, rateLimitService, jwtUtil);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void lookup_invalidIsbn_throwsInvalidIsbnException() {
        assertThatThrownBy(() -> service.lookup("not-valid"))
                .isInstanceOf(InvalidIsbnException.class);

        verifyNoInteractions(oszkNektarClient, rateLimitService);
    }

    @Test
    void lookup_validIsbn_adminRole_skipsRateLimit_returnsResult() {
        setUpAuth(Role.ADMIN);
        IsbnLookupResponse expected = buildResult();
        when(oszkNektarClient.lookup(VALID_ISBN_NORMALIZED)).thenReturn(Optional.of(expected));

        Optional<IsbnLookupResponse> result = service.lookup(VALID_ISBN_RAW);

        assertThat(result).contains(expected);
        verifyNoInteractions(rateLimitService);
    }

    @Test
    void lookup_validIsbn_demoRole_oszkReturnsResult_checksAndIncrements() {
        setUpAuth(Role.DEMO);
        when(jwtUtil.currentJti()).thenReturn(JTI);
        when(oszkNektarClient.lookup(VALID_ISBN_NORMALIZED)).thenReturn(Optional.of(buildResult()));

        service.lookup(VALID_ISBN_RAW);

        verify(rateLimitService).checkLimits(JTI);
        verify(rateLimitService).incrementCounters(JTI);
    }

    @Test
    void lookup_validIsbn_demoRole_oszkReturnsEmpty_checksButDoesNotIncrement() {
        setUpAuth(Role.DEMO);
        when(jwtUtil.currentJti()).thenReturn(JTI);
        when(oszkNektarClient.lookup(VALID_ISBN_NORMALIZED)).thenReturn(Optional.empty());

        service.lookup(VALID_ISBN_RAW);

        verify(rateLimitService).checkLimits(JTI);
        verify(rateLimitService, never()).incrementCounters(any());
    }

    @Test
    void lookup_visitorRole_skipsRateLimit() {
        setUpAuth(Role.VISITOR);
        when(oszkNektarClient.lookup(VALID_ISBN_NORMALIZED)).thenReturn(Optional.empty());

        service.lookup(VALID_ISBN_RAW);

        verifyNoInteractions(rateLimitService);
    }

    @Test
    void lookup_oszkNotFound_returnsEmpty() {
        setUpAuth(Role.ADMIN);
        when(oszkNektarClient.lookup(any())).thenReturn(Optional.empty());

        assertThat(service.lookup(VALID_ISBN_RAW)).isEmpty();
    }

    @Test
    void lookup_passesNormalizedIsbnToClient() {
        setUpAuth(Role.ADMIN);
        when(oszkNektarClient.lookup(VALID_ISBN_NORMALIZED)).thenReturn(Optional.empty());

        service.lookup(VALID_ISBN_RAW);

        verify(oszkNektarClient).lookup(VALID_ISBN_NORMALIZED);
    }

    private void setUpAuth(Role role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setRole(role);
        user.setActive(true);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
        auth.setDetails(JTI);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private IsbnLookupResponse buildResult() {
        return new IsbnLookupResponse(
                VALID_ISBN_NORMALIZED, "Test Title", null,
                List.of("Author"), "Publisher", 2020, 300, "hu", IsbnSource.OSZK
        );
    }
}
