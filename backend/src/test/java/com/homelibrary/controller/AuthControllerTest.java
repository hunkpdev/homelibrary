package com.homelibrary.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelibrary.config.CorsProperties;
import com.homelibrary.dto.LoginRequest;
import com.homelibrary.dto.LoginResponse;
import com.homelibrary.dto.LoginResult;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.service.AuthService;
import com.homelibrary.util.JwtUtil;
import com.homelibrary.util.RefreshTokenCookieBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.Cookie;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private RefreshTokenCookieBuilder cookieBuilder;

    // Required by @WebMvcTest: SecurityConfig pulls in CorsProperties, JwtUtil and UserRepository
    @MockitoBean
    private CorsProperties corsProperties;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    private static ResponseCookie setRefreshTokenCookie(String value) {
        return ResponseCookie.from("refreshToken", value)
                .httpOnly(true).secure(false).sameSite("Strict").path("/api/auth").maxAge(604800L).build();
    }

    private static ResponseCookie deleteRefreshTokenCookie() {
        return ResponseCookie.from("refreshToken", "")
                .httpOnly(true).secure(false).sameSite("Strict").path("/api/auth").maxAge(0).build();
    }

    @Test
    void login_validCredentials_returns200WithTokenAndCookie() throws Exception {
        LoginResponse loginResponse = new LoginResponse("access.token.here", "Bearer", 900L);
        when(authService.login(any())).thenReturn(new LoginResult(loginResponse, "uuid:randompart"));
        when(cookieBuilder.buildSetCookie("uuid:randompart")).thenReturn(setRefreshTokenCookie("uuid:randompart"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("admin", "password"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access.token.here"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("refreshToken=uuid:randompart")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("SameSite=Strict")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Path=/api/auth")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Max-Age=604800")));
    }

    @Test
    void login_invalidCredentials_returns401() throws Exception {
        when(authService.login(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("admin", "wrong"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_validCookie_returns200WithNewTokenAndCookie() throws Exception {
        LoginResponse loginResponse = new LoginResponse("new.access.token", "Bearer", 900L);
        when(authService.refresh("uuid:randompart")).thenReturn(new LoginResult(loginResponse, "uuid:newrandompart"));
        when(cookieBuilder.buildSetCookie("uuid:newrandompart")).thenReturn(setRefreshTokenCookie("uuid:newrandompart"));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refreshToken", "uuid:randompart")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new.access.token"))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("refreshToken=uuid:newrandompart")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("SameSite=Strict")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Path=/api/auth")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Max-Age=604800")));
    }

    @Test
    void refresh_missingCookie_returns401() throws Exception {
        when(authService.refresh(null)).thenThrow(new BadCredentialsException("Missing refresh token"));

        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_returns204WithDeleteCookie() throws Exception {
        when(cookieBuilder.buildDeleteCookie()).thenReturn(deleteRefreshTokenCookie());

        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("refreshToken=")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Max-Age=0")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("SameSite=Strict")))
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Path=/api/auth")));
    }
}
