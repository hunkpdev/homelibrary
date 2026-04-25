package com.homelibrary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateRoomRequest(
        @NotBlank @Size(max = 100) String name,
        String description,
        @NotNull Long version
) {}
