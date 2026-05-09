package com.homelibrary.repository.projection;

import java.util.UUID;

public interface BookCountProjection {
    UUID getLocationId();
    Long getCount();
}
