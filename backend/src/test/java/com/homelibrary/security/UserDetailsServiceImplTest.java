package com.homelibrary.security;

import com.homelibrary.entity.User;
import com.homelibrary.model.Role;
import com.homelibrary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserRepository userRepository;

    private UserDetailsServiceImpl userDetailsService;

    @BeforeEach
    void setUp() {
        userDetailsService = new UserDetailsServiceImpl(userRepository);
    }

    @Test
    void loadUserByUsername_existingUser_returnsUserDetailsWithCorrectUsernameAndAuthority() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("admin");
        user.setPasswordHash("$2a$12$hashedpassword");
        user.setRole(Role.ADMIN);
        user.setActive(true);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        UserDetails result = userDetailsService.loadUserByUsername("admin");

        assertThat(result.getUsername()).isEqualTo("admin");
        assertThat(result.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void loadUserByUsername_inactiveUser_returnsDisabledUserDetails() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("inactive");
        user.setPasswordHash("$2a$12$hashedpassword");
        user.setRole(Role.VISITOR);
        user.setActive(false);
        when(userRepository.findByUsername("inactive")).thenReturn(Optional.of(user));

        UserDetails result = userDetailsService.loadUserByUsername("inactive");

        assertThat(result.isEnabled()).isFalse();
    }

    @Test
    void loadUserByUsername_nonExistingUser_throwsUsernameNotFoundException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("unknown"))
                .isInstanceOf(UsernameNotFoundException.class);
    }
}
