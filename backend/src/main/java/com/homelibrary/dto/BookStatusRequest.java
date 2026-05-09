package com.homelibrary.dto;

import com.homelibrary.model.BookStatus;
import jakarta.validation.constraints.NotNull;

public record BookStatusRequest(@NotNull BookStatus status) {}
