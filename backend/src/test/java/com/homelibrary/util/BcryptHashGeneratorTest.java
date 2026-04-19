package com.homelibrary.util;

import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertTrue;

@Disabled("Utility for local hash generation only — not a real test")
@Slf4j
class BcryptHashGeneratorTest {

    @Test
    void generateHash() {
        String password = "your-password-goes-here";
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        String hash = encoder.encode(password);
        log.info("ADMIN_PASSWORD_HASH={}", hash);
        assertTrue(encoder.matches(password, hash));
    }
}
