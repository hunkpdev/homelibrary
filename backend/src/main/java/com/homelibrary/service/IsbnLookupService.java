package com.homelibrary.service;

import com.homelibrary.dto.IsbnLookupResponse;
import com.homelibrary.entity.User;
import com.homelibrary.isbn.OszkNektarClient;
import com.homelibrary.model.Role;
import com.homelibrary.util.IsbnUtils;
import com.homelibrary.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@Service
public class IsbnLookupService {

    private final OszkNektarClient oszkNektarClient;
    private final DemoIsbnRateLimitService rateLimitService;
    private final JwtUtil jwtUtil;

    public Optional<IsbnLookupResponse> lookup(String isbn) {
        String normalized = IsbnUtils.normalize(isbn);
        if (isDemo()) {
            return lookupAsDemo(normalized);
        }
        return oszkNektarClient.lookup(normalized);
    }

    private boolean isDemo() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null
                && auth.getPrincipal() instanceof User user
                && user.getRole() == Role.DEMO;
    }

    private Optional<IsbnLookupResponse> lookupAsDemo(String normalized) {
        String jti = jwtUtil.currentJti();
        rateLimitService.checkLimits(jti);
        Optional<IsbnLookupResponse> result = oszkNektarClient.lookup(normalized);
        if (result.isPresent()) {
            rateLimitService.incrementCounters(jti);
        }
        return result;
    }
}
