package com.homelibrary.util;

import com.homelibrary.config.CookieProperties;
import com.homelibrary.config.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@RequiredArgsConstructor
@Component
public class RefreshTokenCookieUtil {

    private static final String COOKIE_NAME = "refreshToken";
    private static final String COOKIE_PATH = "/api/auth";
    private static final String SAME_SITE = "Strict";

    private final CookieProperties cookieProperties;
    private final JwtProperties jwtProperties;

    public RefreshTokenCookie parse(String cookieValue) {
        if (cookieValue == null) {
            throw new BadCredentialsException("Missing refresh token");
        }
        String[] parts = cookieValue.split(":", 2);
        if (parts.length != 2) {
            throw new BadCredentialsException("Invalid refresh token format");
        }
        try {
            UUID userId = UUID.fromString(parts[0]);
            return new RefreshTokenCookie(userId, parts[1]);
        } catch (IllegalArgumentException e) {
            throw new BadCredentialsException("Invalid refresh token format");
        }
    }

    public ResponseCookie buildSetCookie(String value) {
        return build(value, jwtProperties.getRefreshTokenExpirationMs() / 1000);
    }

    public ResponseCookie buildDeleteCookie() {
        return build("", 0);
    }

    private ResponseCookie build(String value, long maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(cookieProperties.isSecure())
                .sameSite(SAME_SITE)
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
