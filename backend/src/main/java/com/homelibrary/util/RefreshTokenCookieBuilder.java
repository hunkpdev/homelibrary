package com.homelibrary.util;

import com.homelibrary.config.CookieProperties;
import com.homelibrary.config.JwtProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenCookieBuilder {

    private static final String COOKIE_NAME = "refreshToken";
    private static final String COOKIE_PATH = "/api/auth";
    private static final String SAME_SITE = "Strict";

    private final CookieProperties cookieProperties;
    private final long maxAgeSeconds;

    public RefreshTokenCookieBuilder(CookieProperties cookieProperties, JwtProperties jwtProperties) {
        this.cookieProperties = cookieProperties;
        this.maxAgeSeconds = jwtProperties.getRefreshTokenExpirationMs() / 1000;
    }

    public ResponseCookie buildSetCookie(String value) {
        return build(value, maxAgeSeconds);
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
