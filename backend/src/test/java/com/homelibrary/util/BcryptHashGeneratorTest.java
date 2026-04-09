package com.homelibrary.util;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class BcryptHashGeneratorTest {

    @Test
    void generateHash() {
        String password = "your-password-goes-here";
        String hash = new BCryptPasswordEncoder(12).encode(password);
        System.out.println("ADMIN_PASSWORD_HASH=" + hash);
    }
}
