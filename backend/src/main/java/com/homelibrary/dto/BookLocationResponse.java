package com.homelibrary.dto;

import java.util.UUID;

public record BookLocationResponse(UUID id, String name, BookRoomResponse room) {
}
