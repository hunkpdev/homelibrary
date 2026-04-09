package com.homelibrary.util;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertTrue;

class BcryptHashGeneratorTest {

    @Test
    void generateHash() {
        String password = "your-password-goes-here";
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        String hash = encoder.encode(password);
        System.out.println("ADMIN_PASSWORD_HASH=" + hash);
        assertTrue(encoder.matches(password, hash));
    }
}
