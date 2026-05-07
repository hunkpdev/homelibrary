package com.homelibrary.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BookLocationRequest(@NotNull UUID locationId) {}
