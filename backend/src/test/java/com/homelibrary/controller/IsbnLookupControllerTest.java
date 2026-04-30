package com.homelibrary.controller;

import com.homelibrary.config.CorsProperties;
import com.homelibrary.config.MapperConfig;
import com.homelibrary.dto.IsbnLookupResult;
import com.homelibrary.exception.DemoRateLimitExceededException;
import com.homelibrary.exception.InvalidIsbnException;
import com.homelibrary.model.IsbnSource;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.service.IsbnLookupService;
import com.homelibrary.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(IsbnLookupController.class)
@Import({IsbnLookupControllerTest.MethodSecurityTestConfig.class, MapperConfig.class})
class IsbnLookupControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {}

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IsbnLookupService isbnLookupService;

    @MockitoBean
    private CorsProperties corsProperties;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    private static final String ISBN = "9789634058489";

    @Test
    @WithMockUser(roles = "ADMIN")
    void lookup_adminRole_found_returns200WithBody() throws Exception {
        IsbnLookupResult result = new IsbnLookupResult(
                ISBN, "Test Book", null, List.of("Author"), "Publisher", 2020, 300, "hu", IsbnSource.OSZK
        );
        when(isbnLookupService.lookup(ISBN)).thenReturn(Optional.of(result));

        mockMvc.perform(get("/api/books/isbn/{isbn}", ISBN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isbn").value(ISBN))
                .andExpect(jsonPath("$.title").value("Test Book"))
                .andExpect(jsonPath("$.found").value(true))
                .andExpect(jsonPath("$.source").value("OSZK"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void lookup_adminRole_notFound_returns200WithFoundFalse() throws Exception {
        when(isbnLookupService.lookup(ISBN)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/books/isbn/{isbn}", ISBN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isbn").value(ISBN))
                .andExpect(jsonPath("$.found").value(false))
                .andExpect(jsonPath("$.title").doesNotExist());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void lookup_visitorRole_returns403() throws Exception {
        mockMvc.perform(get("/api/books/isbn/{isbn}", ISBN))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DEMO")
    void lookup_demoRole_rateLimitExceeded_returns429WithBody() throws Exception {
        when(isbnLookupService.lookup(any())).thenThrow(new DemoRateLimitExceededException("session"));

        mockMvc.perform(get("/api/books/isbn/{isbn}", ISBN))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.found").value(false))
                .andExpect(jsonPath("$.rateLimitExceeded").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void lookup_invalidIsbn_returns422() throws Exception {
        when(isbnLookupService.lookup(any())).thenThrow(new InvalidIsbnException());

        mockMvc.perform(get("/api/books/isbn/invalid"))
                .andExpect(status().is(422));
    }
}
