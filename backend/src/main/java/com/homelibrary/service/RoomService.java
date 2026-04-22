package com.homelibrary.service;

import com.homelibrary.entity.Room;
import com.homelibrary.exception.ActiveChildException;
import com.homelibrary.exception.ResourceNotFoundException;
import com.homelibrary.repository.LocationRepository;
import com.homelibrary.repository.RoomRepository;
import com.homelibrary.repository.projection.LocationCountProjection;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final LocationRepository locationRepository;

    @Transactional(readOnly = true)
    public Page<RoomWithCount> list(String name, Pageable pageable) {
        Specification<Room> spec = buildSpec(name);
        Page<Room> roomPage = roomRepository.findAll(spec, pageable);

        if (roomPage.isEmpty()) {
            return roomPage.map(room -> new RoomWithCount(room, 0));
        }

        List<UUID> roomIds = roomPage.stream().map(Room::getId).toList();
        Map<UUID, Long> countByRoomId = locationRepository.countActiveLocationsByRoomIds(roomIds)
                .stream()
                .collect(Collectors.toMap(LocationCountProjection::getRoomId, LocationCountProjection::getCount));

        List<RoomWithCount> result = roomPage.stream()
                .map(room -> new RoomWithCount(room, countByRoomId.getOrDefault(room.getId(), 0L).intValue()))
                .toList();

        return new PageImpl<>(result, pageable, roomPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<RoomWithCount> findAll() {
        List<Room> rooms = roomRepository.findAll(buildSpec(null), Sort.by(Sort.Direction.ASC, "name"));
        if (rooms.isEmpty()) {
            return List.of();
        }
        List<UUID> roomIds = rooms.stream().map(Room::getId).toList();
        Map<UUID, Long> countByRoomId = locationRepository.countActiveLocationsByRoomIds(roomIds)
                .stream()
                .collect(Collectors.toMap(LocationCountProjection::getRoomId, LocationCountProjection::getCount));
        return rooms.stream()
                .map(room -> new RoomWithCount(room, countByRoomId.getOrDefault(room.getId(), 0L).intValue()))
                .toList();
    }

    @Transactional
    public Room create(String name, String description) {
        Room room = new Room();
        room.setName(name);
        room.setDescription(description);
        room.setActive(true);
        return roomRepository.save(room);
    }

    @Transactional
    public Room update(UUID id, String name, String description, Long version) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + id));
        room.setName(name);
        room.setDescription(description);
        room.setVersion(version);
        return roomRepository.save(room);
    }

    @Transactional
    public void delete(UUID id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + id));
        if (locationRepository.existsByRoomAndActiveTrue(room)) {
            throw new ActiveChildException("Room has active locations: " + id);
        }
        room.setActive(false);
        roomRepository.save(room);
    }

    private Specification<Room> buildSpec(String name) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("active")));
            if (name != null && !name.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
