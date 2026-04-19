package com.homelibrary.util;

import com.homelibrary.config.JwtProperties;
import com.homelibrary.entity.User;
import com.homelibrary.model.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    void generateToken_thenExtractUserId_returnsCorrectUuid() {
        String token = jwtUtil.generateToken(user);

        assertThat(jwtUtil.extractUserId(token)).isEqualTo(user.getId());
    }

    @Test
    void extractUserId_withTamperedToken_throwsException() {
        String token = jwtUtil.generateToken(user);
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThatThrownBy(() -> jwtUtil.extractUserId(tampered))
                .isInstanceOf(Exception.class);
    }

    @Test
    void extractUserId_withExpiredToken_throwsException() {
        JwtProperties expiredProperties = new JwtProperties();
        expiredProperties.setSecret("test-secret-key-for-unit-tests-min32chars!!");
        expiredProperties.setAccessTokenExpirationMs(1L);
        JwtUtil expiredJwtUtil = new JwtUtil(expiredProperties);

        String token = expiredJwtUtil.generateToken(user);

        assertThatThrownBy(() -> expiredJwtUtil.extractUserId(token))
                .isInstanceOf(Exception.class);
    }
}
