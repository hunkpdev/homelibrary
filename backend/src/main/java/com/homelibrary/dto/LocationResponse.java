package com.homelibrary.dto;

import java.util.UUID;

public record LocationResponse(
        UUID id,
        String name,
        String description,
        EmbeddedRoomSummary room,
        int bookCount,
        Long version
) {}
