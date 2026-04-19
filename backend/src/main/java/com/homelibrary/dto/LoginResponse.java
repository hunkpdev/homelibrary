package com.homelibrary.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn
) {}
