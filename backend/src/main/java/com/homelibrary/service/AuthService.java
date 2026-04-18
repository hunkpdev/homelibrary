package com.homelibrary.service;

import com.homelibrary.config.JwtProperties;
import com.homelibrary.dto.LoginRequest;
import com.homelibrary.dto.LoginResponse;
import com.homelibrary.dto.LoginResult;
import com.homelibrary.entity.User;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.util.JwtUtil;
import com.homelibrary.util.RefreshTokenCookie;
import com.homelibrary.util.RefreshTokenCookieUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
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
    private final RefreshTokenCookieUtil refreshTokenCookieUtil;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       JwtUtil jwtUtil,
                       JwtProperties jwtProperties,
                       PasswordEncoder passwordEncoder,
                       RefreshTokenCookieUtil refreshTokenCookieUtil) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.jwtProperties = jwtProperties;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenCookieUtil = refreshTokenCookieUtil;
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

    @Transactional
    public LoginResult refresh(String refreshTokenCookie) {
        RefreshTokenCookie parsed = refreshTokenCookieUtil.parse(refreshTokenCookie);

        User user = userRepository.findById(parsed.userId())
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        validateRefreshToken(user, parsed.secureRandomPart());

        String newAccessToken = jwtUtil.generateToken(user);
        String newRefreshToken = generateAndSaveRefreshToken(user);

        LoginResponse loginResponse = new LoginResponse(
                newAccessToken,
                "Bearer",
                jwtProperties.getAccessTokenExpirationMs() / 1000
        );
        return new LoginResult(loginResponse, newRefreshToken);
    }

    private void validateRefreshToken(User user, String secureRandomPart) {
        if (!user.isActive()) {
            throw new BadCredentialsException("User is inactive");
        }
        if (user.getRefreshTokenExpiresAt() == null
                || user.getRefreshTokenExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BadCredentialsException("Refresh token expired");
        }
        if (user.getRefreshTokenHash() == null
                || !passwordEncoder.matches(secureRandomPart, user.getRefreshTokenHash())) {
            throw new BadCredentialsException("Invalid refresh token");
        }
    }

    @Transactional
    public void logout(User principal) {
        if (principal == null) return;
        userRepository.findById(principal.getId()).ifPresent(user -> {
            user.setRefreshTokenHash(null);
            user.setRefreshTokenExpiresAt(null);
            userRepository.save(user);
        });
    }

    // package-private for testing
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
