package com.homelibrary.dto;

import java.util.UUID;

public record LocationResponse(
        UUID id,
        String name,
        String description,
        RoomResponse room,
        int bookCount,
        Long version
) {}
