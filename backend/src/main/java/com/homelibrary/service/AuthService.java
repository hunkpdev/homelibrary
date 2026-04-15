package com.homelibrary.service;

import com.homelibrary.config.JwtProperties;
import com.homelibrary.dto.LoginRequest;
import com.homelibrary.dto.LoginResponse;
import com.homelibrary.dto.LoginResult;
import com.homelibrary.entity.User;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.util.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       JwtUtil jwtUtil,
                       JwtProperties jwtProperties,
                       PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.jwtProperties = jwtProperties;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public LoginResult login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        User user = userRepository.findByUsername(request.username())
                .orElseThrow();

        String accessToken = jwtUtil.generateToken(user);
        String refreshToken = generateAndSaveRefreshToken(user);

        LoginResponse loginResponse = new LoginResponse(
                accessToken,
                "Bearer",
                jwtProperties.getAccessTokenExpirationMs() / 1000
        );
        return new LoginResult(loginResponse, refreshToken);
    }

    String generateAndSaveRefreshToken(User user) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String secureRandomPart = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        String refreshToken = user.getId() + ":" + secureRandomPart;
        user.setRefreshTokenHash(passwordEncoder.encode(secureRandomPart));
        user.setRefreshTokenExpiresAt(OffsetDateTime.now().plusSeconds(
                jwtProperties.getRefreshTokenExpirationMs() / 1000
        ));
        userRepository.save(user);
        return refreshToken;
    }
}
