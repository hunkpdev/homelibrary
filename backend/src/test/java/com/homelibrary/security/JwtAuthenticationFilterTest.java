package com.homelibrary.security;

import com.homelibrary.config.JwtProperties;
import com.homelibrary.entity.User;
import com.homelibrary.model.Role;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private UserRepository userRepository;

    private JwtUtil jwtUtil;
    private JwtAuthenticationFilter filter;
    private User activeUser;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("test-secret-key-for-unit-tests-min32chars!!");
        properties.setAccessTokenExpirationMs(900_000L);
        jwtUtil = new JwtUtil(properties);

        filter = new JwtAuthenticationFilter(jwtUtil, userRepository);

        activeUser = new User();
        activeUser.setId(UUID.randomUUID());
        activeUser.setUsername("testuser");
        activeUser.setRole(Role.ADMIN);
        activeUser.setActive(true);

        SecurityContextHolder.clearContext();
    }

    @Test
    void validToken_activeUser_setsAuthentication() throws Exception {
        String token = jwtUtil.generateToken(activeUser);
        when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilterInternal(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(activeUser);
    }

    @Test
    void missingAuthorizationHeader_doesNotSetAuthentication() throws Exception {
        filter.doFilterInternal(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void nonBearerHeader_doesNotSetAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");

        filter.doFilterInternal(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void invalidToken_doesNotSetAuthentication() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid.token.here");

        filter.doFilterInternal(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void inactiveUser_doesNotSetAuthentication() throws Exception {
        activeUser.setActive(false);
        String token = jwtUtil.generateToken(activeUser);
        when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilterInternal(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
