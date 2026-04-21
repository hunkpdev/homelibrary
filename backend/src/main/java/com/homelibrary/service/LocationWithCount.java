package com.homelibrary.service;

import com.homelibrary.entity.Location;

public record LocationWithCount(Location location, int bookCount) {
}
