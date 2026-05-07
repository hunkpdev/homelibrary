package com.homelibrary.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelibrary.config.CorsProperties;
import com.homelibrary.dto.BookCreateRequest;
import com.homelibrary.dto.BookResponse;
import com.homelibrary.dto.BookUpdateRequest;
import com.homelibrary.entity.User;
import com.homelibrary.model.BookStatus;
import com.homelibrary.model.Role;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.service.BookService;
import com.homelibrary.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookController.class)
@Import(BookControllerTest.MethodSecurityTestConfig.class)
class BookControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {}

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private BookService bookService;

    @MockitoBean
    private CorsProperties corsProperties;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(roles = {"DEMO", "VISITOR"})
    void search_returns200() throws Exception {
        when(bookService.search(any(), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/books"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void search_pageSizeExceeds100_returns400() throws Exception {
        mockMvc.perform(get("/api/books").param("size", "101"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void getById_visitorRole_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(bookService.getById(id)).thenReturn(bookResponse(id));

        mockMvc.perform(get("/api/books/{id}", id))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void create_visitorRole_returns403() throws Exception {
        mockMvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new BookCreateRequest(null, "Clean Code", null, null, null, null, null, null, null, null, null, null))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "DEMO")
    void create_demoRole_returns403() throws Exception {
        mockMvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new BookCreateRequest(null, "Clean Code", null, null, null, null, null, null, null, null, null, null))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_adminRole_returns201() throws Exception {
        UUID bookId = UUID.randomUUID();
        when(bookService.create(any(), any())).thenReturn(bookResponse(bookId));

        mockMvc.perform(post("/api/books")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(adminAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new BookCreateRequest(null, "Clean Code", null, null, null, null, null, null, null, null, null, null))))
                .andExpect(status().isCreated());
    }

    @Test
    void create_missingTitle_returns400() throws Exception {
        mockMvc.perform(post("/api/books")
                        .with(SecurityMockMvcRequestPostProcessors.authentication(adminAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void update_adminRole_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(bookService.update(any(), any())).thenReturn(bookResponse(id));

        mockMvc.perform(put("/api/books/{id}", id)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(adminAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new BookUpdateRequest(null, "Clean Code", null, null, null, null, null, null, null, null, null, null, 0L))))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void update_visitorRole_returns403() throws Exception {
        UUID id = UUID.randomUUID();
        mockMvc.perform(put("/api/books/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new BookUpdateRequest(null, "Clean Code", null, null, null, null, null, null, null, null, null, null, 0L))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_adminRole_returns204() throws Exception {
        UUID id = UUID.randomUUID();
        mockMvc.perform(delete("/api/books/{id}", id)
                        .with(SecurityMockMvcRequestPostProcessors.authentication(adminAuthentication())))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void delete_visitorRole_returns403() throws Exception {
        UUID id = UUID.randomUUID();
        mockMvc.perform(delete("/api/books/{id}", id))
                .andExpect(status().isForbidden());
    }

    private UsernamePasswordAuthenticationToken adminAuthentication() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("admin");
        user.setRole(Role.ADMIN);
        user.setActive(true);
        return new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private BookResponse bookResponse(UUID id) {
        return new BookResponse(id, null, "Clean Code", null, List.of(), null, null, null, null,
                List.of(), null, null, BookStatus.AT_HOME, null, null, 0L, null, null);
    }
}
