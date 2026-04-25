package com.homelibrary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateLocationRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull UUID roomId,
        @Size(max = 2000) String description
) {}
