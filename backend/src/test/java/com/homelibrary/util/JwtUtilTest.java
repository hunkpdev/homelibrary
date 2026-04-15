package com.homelibrary.util;

import com.homelibrary.config.JwtProperties;
import com.homelibrary.entity.User;
import com.homelibrary.model.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private User user;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("test-secret-key-for-unit-tests-min32chars!!");
        properties.setAccessTokenExpirationMs(900_000L);

        jwtUtil = new JwtUtil(properties);

        user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("testuser");
        user.setRole(Role.ADMIN);
    }

    @Test
    void generateToken_thenIsTokenValid_returnsTrue() {
        String token = jwtUtil.generateToken(user);

        assertThat(jwtUtil.isTokenValid(token)).isTrue();
    }

    @Test
    void generateToken_thenExtractUserId_returnsCorrectUuid() {
        String token = jwtUtil.generateToken(user);

        assertThat(jwtUtil.extractUserId(token)).isEqualTo(user.getId());
    }

    @Test
    void isTokenValid_withTamperedToken_returnsFalse() {
        String token = jwtUtil.generateToken(user);
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(jwtUtil.isTokenValid(tampered)).isFalse();
    }

    @Test
    void isTokenValid_withExpiredToken_returnsFalse() {
        JwtProperties expiredProperties = new JwtProperties();
        expiredProperties.setSecret("test-secret-key-for-unit-tests-min32chars!!");
        expiredProperties.setAccessTokenExpirationMs(1L);
        JwtUtil expiredJwtUtil = new JwtUtil(expiredProperties);

        String token = expiredJwtUtil.generateToken(user);

        assertThat(expiredJwtUtil.isTokenValid(token)).isFalse();
    }
}
