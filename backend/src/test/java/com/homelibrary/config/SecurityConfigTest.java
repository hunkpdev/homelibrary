package com.homelibrary.config;

import com.homelibrary.controller.LocationController;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.service.LocationService;
import com.homelibrary.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LocationController.class)
@Import(SecurityConfigTest.MethodSecurityTestConfig.class)
class SecurityConfigTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {}

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LocationService locationService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(roles = "DEMO")
    void demo_getApiEndpoint_returns200() throws Exception {
        when(locationService.list(isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/locations"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "DEMO")
    void demo_postApiEndpoint_returns403() throws Exception {
        mockMvc.perform(post("/api/locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"roomId\":\"00000000-0000-0000-0000-000000000001\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DEMO")
    void demo_putApiEndpoint_returns403() throws Exception {
        mockMvc.perform(put("/api/locations/{id}", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"version\":1}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DEMO")
    void demo_deleteApiEndpoint_returns403() throws Exception {
        mockMvc.perform(delete("/api/locations/{id}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }
}
