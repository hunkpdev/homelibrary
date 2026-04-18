package com.homelibrary.util;

import java.util.UUID;

public record RefreshTokenCookie(UUID userId, String secureRandomPart) {}
