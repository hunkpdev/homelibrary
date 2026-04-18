package com.homelibrary.util;

import com.homelibrary.config.CookieProperties;
import com.homelibrary.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.BadCredentialsException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenCookieUtilTest {

    @Mock
    private CookieProperties cookieProperties;
    @Mock
    private JwtProperties jwtProperties;

    private RefreshTokenCookieUtil cookieUtil;

    @BeforeEach
    void setUp() {
        when(jwtProperties.getRefreshTokenExpirationMs()).thenReturn(604_800_000L);
        cookieUtil = new RefreshTokenCookieUtil(cookieProperties, jwtProperties);
    }

    @Test
    void parse_validToken_returnsRecord() {
        UUID userId = UUID.randomUUID();
        String token = userId + ":somesecurepart";

        RefreshTokenCookie result = cookieUtil.parse(token);

        assertThat(result.userId()).isEqualTo(userId);
        assertThat(result.secureRandomPart()).isEqualTo("somesecurepart");
    }

    @Test
    void parse_nullCookie_throwsBadCredentials() {
        assertThatThrownBy(() -> cookieUtil.parse(null))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void parse_missingColon_throwsBadCredentials() {
        assertThatThrownBy(() -> cookieUtil.parse("notavalidtoken"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void parse_invalidUuid_throwsBadCredentials() {
        assertThatThrownBy(() -> cookieUtil.parse("not-a-uuid:somesecurepart"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void buildSetCookie_setsCorrectAttributes() {
        when(cookieProperties.isSecure()).thenReturn(false);

        ResponseCookie cookie = cookieUtil.buildSetCookie("uuid:part");

        assertThat(cookie.getName()).isEqualTo("refreshToken");
        assertThat(cookie.getValue()).isEqualTo("uuid:part");
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(604800L);
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/auth");
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
    }

    @Test
    void buildDeleteCookie_setsMaxAgeZero() {
        when(cookieProperties.isSecure()).thenReturn(false);

        ResponseCookie cookie = cookieUtil.buildDeleteCookie();

        assertThat(cookie.getName()).isEqualTo("refreshToken");
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge().getSeconds()).isZero();
    }
}
