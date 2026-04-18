package com.homelibrary.service;

import com.homelibrary.config.JwtProperties;
import com.homelibrary.dto.LoginRequest;
import com.homelibrary.dto.LoginResult;
import com.homelibrary.entity.User;
import com.homelibrary.model.Role;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.util.JwtUtil;
import org.junit.jupiter.api.AfterEach;
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

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

        LoginRequest badRequest = new LoginRequest("admin", "wrong");
        assertThatThrownBy(() -> authService.login(badRequest))
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

    @Test
    void refresh_validToken_returnsNewAccessTokenAndRotatesRefreshToken() {
        String oldRefreshToken = authService.generateAndSaveRefreshToken(user);
        String oldHash = user.getRefreshTokenHash();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        LoginResult result = authService.refresh(oldRefreshToken);

        assertThat(result.loginResponse().accessToken()).isNotBlank();
        assertThat(result.loginResponse().tokenType()).isEqualTo("Bearer");
        assertThat(result.refreshToken()).isNotEqualTo(oldRefreshToken);
        assertThat(user.getRefreshTokenHash()).isNotEqualTo(oldHash);
        assertThat(user.getRefreshTokenExpiresAt()).isAfter(OffsetDateTime.now());
    }

    @Test
    void refresh_hashMismatch_throwsAndDoesNotModifyDb() {
        authService.generateAndSaveRefreshToken(user);
        clearInvocations(userRepository);
        String tamperedToken = user.getId() + ":wrongrandompart";
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        String hashBefore = user.getRefreshTokenHash();

        assertThatThrownBy(() -> authService.refresh(tamperedToken))
                .isInstanceOf(BadCredentialsException.class);

        assertThat(user.getRefreshTokenHash()).isEqualTo(hashBefore);
        verify(userRepository, never()).save(any());
    }

    @Test
    void refresh_expiredToken_throws() {
        authService.generateAndSaveRefreshToken(user);
        clearInvocations(userRepository);
        user.setRefreshTokenExpiresAt(OffsetDateTime.now().minusSeconds(1));
        String expiredToken = user.getId() + ":anypart";
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.refresh(expiredToken))
                .isInstanceOf(BadCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void refresh_nonExistentUserId_throws() {
        UUID unknownId = UUID.randomUUID();
        when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(unknownId + ":anypart"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void refresh_inactiveUser_throws() {
        user.setActive(false);
        authService.generateAndSaveRefreshToken(user);
        clearInvocations(userRepository);
        String token = user.getId() + ":anypart";
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.refresh(token))
                .isInstanceOf(BadCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void refresh_nullCookie_throws() {
        assertThatThrownBy(() -> authService.refresh(null))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void refresh_rotation_oldTokenInvalidAfterRefresh() {
        String firstToken = authService.generateAndSaveRefreshToken(user);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        authService.refresh(firstToken);

        assertThatThrownBy(() -> authService.refresh(firstToken))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void logout_authenticatedUser_clearsRefreshTokenFieldsInDb() {
        authService.generateAndSaveRefreshToken(user);
        clearInvocations(userRepository);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        authService.logout(user);

        assertThat(user.getRefreshTokenHash()).isNull();
        assertThat(user.getRefreshTokenExpiresAt()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    void logout_nullPrincipal_doesNotModifyDb() {
        authService.logout(null);

        verify(userRepository, never()).save(any());
    }
}
