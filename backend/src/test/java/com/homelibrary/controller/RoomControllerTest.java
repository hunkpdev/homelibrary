package com.homelibrary.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelibrary.config.CorsProperties;
import com.homelibrary.dto.RoomRequest;
import com.homelibrary.entity.Room;
import com.homelibrary.exception.ActiveChildException;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.service.RoomService;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoomController.class)
@Import(RoomControllerTest.MethodSecurityTestConfig.class)
class RoomControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityTestConfig {}


    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private RoomService roomService;

    @MockitoBean
    private CorsProperties corsProperties;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    @WithMockUser(roles = "VISITOR")
    void list_visitorRole_returns200() throws Exception {
        when(roomService.list(isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void create_visitorRole_returns403() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RoomRequest("Library", null, null))))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_missingName_returns400() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void delete_serviceThrowsActiveChildException_returns409() throws Exception {
        UUID id = UUID.randomUUID();
        doThrow(new ActiveChildException("Room has active locations"))
                .when(roomService).delete(id);

        mockMvc.perform(delete("/api/rooms/{id}", id))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(roles = "VISITOR")
    void listAll_visitorRole_returns200() throws Exception {
        when(roomService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/rooms/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void create_validRequest_returns201() throws Exception {
        Room room = new Room();
        room.setId(UUID.randomUUID());
        room.setName("Library");
        room.setVersion(0L);
        when(roomService.create("Library", null)).thenReturn(room);

        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RoomRequest("Library", null, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Library"));
    }
}
