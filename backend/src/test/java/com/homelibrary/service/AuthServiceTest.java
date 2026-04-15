package com.homelibrary.service;

import com.homelibrary.config.JwtProperties;
import com.homelibrary.dto.LoginRequest;
import com.homelibrary.dto.LoginResult;
import com.homelibrary.entity.User;
import com.homelibrary.model.Role;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UserRepository userRepository;

    private JwtUtil jwtUtil;
    private JwtProperties jwtProperties;
    private PasswordEncoder passwordEncoder;
    private AuthService authService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test-secret-key-for-unit-tests-min32chars!!");
        jwtProperties.setAccessTokenExpirationMs(900_000L);
        jwtProperties.setRefreshTokenExpirationMs(604_800_000L);

        jwtUtil = new JwtUtil(jwtProperties);
        passwordEncoder = new BCryptPasswordEncoder(4);

        authService = new AuthService(authenticationManager, userRepository, jwtUtil, jwtProperties, passwordEncoder);

        user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("admin");
        user.setPasswordHash("$2a$12$hashedpassword");
        user.setRole(Role.ADMIN);
        user.setActive(true);
    }

    @Test
    void login_validCredentials_returnsAccessTokenAndSavesRefreshTokenHash() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        LoginResult result = authService.login(new LoginRequest("admin", "password"));

        assertThat(result.loginResponse().accessToken()).isNotBlank();
        assertThat(result.loginResponse().tokenType()).isEqualTo("Bearer");
        assertThat(result.loginResponse().expiresIn()).isEqualTo(900L);
        assertThat(result.refreshToken()).contains(":");
        assertThat(user.getRefreshTokenHash()).isNotNull();
        assertThat(user.getRefreshTokenExpiresAt()).isNotNull();
        verify(userRepository).save(user);
    }

    @Test
    void login_invalidCredentials_throwsAndDoesNotSaveToDb() {
        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));

        assertThatThrownBy(() -> authService.login(new LoginRequest("admin", "wrong")))
                .isInstanceOf(BadCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void generateAndSaveRefreshToken_tokenFormatIsUserIdColonRandomPart() {
        when(userRepository.save(any())).thenReturn(user);

        String refreshToken = authService.generateAndSaveRefreshToken(user);

        String[] parts = refreshToken.split(":");
        assertThat(parts).hasSize(2);
        assertThat(parts[0]).isEqualTo(user.getId().toString());
        assertThat(parts[1]).isNotBlank();
    }

    @Test
    void generateAndSaveRefreshToken_hashIsComputedFromRandomPartOnly() {
        when(userRepository.save(any())).thenReturn(user);

        String refreshToken = authService.generateAndSaveRefreshToken(user);

        String secureRandomPart = refreshToken.split(":")[1];
        assertThat(passwordEncoder.matches(secureRandomPart, user.getRefreshTokenHash())).isTrue();
    }
}
