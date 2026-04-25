package com.homelibrary.repository.projection;

import java.util.UUID;

public interface LocationCountProjection {
    UUID getRoomId();
    Long getCount();
}
