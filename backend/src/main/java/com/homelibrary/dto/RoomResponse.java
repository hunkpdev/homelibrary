package com.homelibrary.dto;

import java.util.UUID;

public record RoomResponse(
        UUID id,
        String name,
        String description,
        int locationCount,
        Long version
) {}
