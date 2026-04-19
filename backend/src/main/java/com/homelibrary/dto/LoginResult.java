package com.homelibrary.dto;

public record LoginResult(
        LoginResponse loginResponse,
        String refreshToken
) {}
