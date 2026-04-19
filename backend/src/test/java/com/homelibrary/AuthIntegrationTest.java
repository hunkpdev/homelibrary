package com.homelibrary;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelibrary.dto.LoginRequest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Base64;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource("classpath:application-test.properties")
class AuthIntegrationTest {

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD = "password";

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @DynamicPropertySource
    static void setAdminPasswordHash(DynamicPropertyRegistry registry) {
        registry.add("ADMIN_PASSWORD_HASH",
                () -> Objects.requireNonNull(new BCryptPasswordEncoder(4).encode(ADMIN_PASSWORD)));
    }

    @Test
    void authFlow_loginRefreshLogout_endToEnd() throws Exception {
        // Step 1: Login → 200 OK, access token + refresh token cookie
        String loginBody = objectMapper.writeValueAsString(new LoginRequest(ADMIN_USERNAME, ADMIN_PASSWORD));
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn();

        String accessToken1 = extractAccessToken(loginResult);
        String refreshToken1 = extractRefreshTokenFromCookie(loginResult);

        // JWT payload contains username and role claims
        JsonNode jwtPayload = decodeJwtPayload(accessToken1);
        assertThat(jwtPayload.get("username").asText()).isEqualTo(ADMIN_USERNAME);
        assertThat(jwtPayload.get("role").asText()).isEqualTo("ADMIN");

        // Step 2: Refresh with step 1 cookie → 200 OK, new access token + new cookie
        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refreshToken", refreshToken1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        String refreshToken2 = extractRefreshTokenFromCookie(refreshResult);
        assertThat(refreshToken2).isNotEqualTo(refreshToken1);

        // Step 3: Old refresh token (step 1) is invalid after rotation → 401
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refreshToken", refreshToken1)))
                .andExpect(status().isUnauthorized());

        // Step 4: Logout with step 1 access token → 204 No Content, Max-Age=0 cookie
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + accessToken1))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie",
                        org.hamcrest.Matchers.containsString("Max-Age=0")));

        // Step 5: Refresh after logout → 401 (DB hash is null)
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refreshToken", refreshToken2)))
                .andExpect(status().isUnauthorized());
    }

    private String extractAccessToken(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        return objectMapper.readTree(body).get("accessToken").asText();
    }

    private String extractRefreshTokenFromCookie(MvcResult result) {
        String setCookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).isNotNull();
        String prefix = "refreshToken=";
        int start = setCookie.indexOf(prefix) + prefix.length();
        int end = setCookie.indexOf(';', start);
        return end == -1 ? setCookie.substring(start) : setCookie.substring(start, end);
    }

    private JsonNode decodeJwtPayload(String jwt) throws Exception {
        String[] parts = jwt.split("\\.");
        String padded = parts[1] + "=".repeat((4 - parts[1].length() % 4) % 4);
        String decoded = new String(Base64.getUrlDecoder().decode(padded));
        return objectMapper.readTree(decoded);
    }
}
