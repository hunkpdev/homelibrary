package com.homelibrary.repository;

import com.homelibrary.entity.Location;
import com.homelibrary.entity.Room;
import com.homelibrary.repository.projection.LocationCountProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LocationRepository extends JpaRepository<Location, UUID>, JpaSpecificationExecutor<Location> {

    boolean existsByRoomAndActiveTrue(Room room);

    @Query("SELECT l.room.id AS roomId, COUNT(l) AS count FROM Location l WHERE l.active = true AND l.room.id IN :roomIds GROUP BY l.room.id")
    List<LocationCountProjection> countActiveLocationsByRoomIds(@Param("roomIds") List<UUID> roomIds);
}
