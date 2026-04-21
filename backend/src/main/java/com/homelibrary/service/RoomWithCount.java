package com.homelibrary.service;

import com.homelibrary.entity.Room;

public record RoomWithCount(Room room, int locationCount) {
}
