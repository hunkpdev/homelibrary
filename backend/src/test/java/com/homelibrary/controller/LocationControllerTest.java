package com.homelibrary.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelibrary.config.CorsProperties;
import com.homelibrary.dto.CreateLocationRequest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LocationController.class)
@Import(LocationControllerTest.MethodSecurityTestConfig.class)
class LocationControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {}

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private LocationService locationService;

    @MockitoBean
    private CorsProperties corsProperties;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(roles = "VISITOR")
    void list_visitorRole_returns200() throws Exception {
        when(locationService.list(isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/locations"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void listAll_visitorRole_returns200() throws Exception {
        when(locationService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/locations/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void create_visitorRole_returns403() throws Exception {
        mockMvc.perform(post("/api/locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateLocationRequest("Left Shelf", UUID.randomUUID(), null))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_missingName_returns400() throws Exception {
        mockMvc.perform(post("/api/locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_withRoomIdInBody_returns400() throws Exception {
        UUID id = UUID.randomUUID();
        String body = "{\"name\":\"Left Shelf\",\"version\":0,\"roomId\":\"" + UUID.randomUUID() + "\"}";

        mockMvc.perform(put("/api/locations/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
