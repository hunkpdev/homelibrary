package com.homelibrary.dto;

import java.util.UUID;

public record EmbeddedRoomSummary(
        UUID id,
        String name
) {}
