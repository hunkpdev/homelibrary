package com.homelibrary.service;

import com.homelibrary.entity.Location;
import com.homelibrary.entity.Room;
import com.homelibrary.exception.ActiveChildException;
import com.homelibrary.exception.ResourceNotFoundException;
import com.homelibrary.model.BookStatus;
import com.homelibrary.repository.BookRepository;
import com.homelibrary.repository.LocationRepository;
import com.homelibrary.repository.RoomRepository;
import com.homelibrary.repository.projection.BookCountProjection;
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
public class LocationService {

    private final LocationRepository locationRepository;
    private final RoomRepository roomRepository;
    private final BookRepository bookRepository;

    @Transactional(readOnly = true)
    public Page<LocationWithCount> list(String name, UUID roomId, String description, Pageable pageable) {
        Specification<Location> spec = buildSpec(name, roomId, description);
        Page<Location> locationPage = locationRepository.findAll(spec, pageable);

        if (locationPage.isEmpty()) {
            return locationPage.map(location -> new LocationWithCount(location, 0));
        }

        List<UUID> locationIds = locationPage.stream().map(Location::getId).toList();
        Map<UUID, Long> countByLocationId = bookRepository.countActiveBooksByLocationIds(locationIds)
                .stream()
                .collect(Collectors.toMap(BookCountProjection::getLocationId, BookCountProjection::getCount));

        List<LocationWithCount> result = locationPage.stream()
                .map(location -> new LocationWithCount(location,
                        countByLocationId.getOrDefault(location.getId(), 0L).intValue()))
                .toList();

        return new PageImpl<>(result, pageable, locationPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<LocationWithCount> findAll() {
        List<Location> locations =
                locationRepository.findAll(buildSpec(null, null, null), Sort.by(Sort.Direction.ASC, "name"));

        if (locations.isEmpty()) {
            return List.of();
        }

        List<UUID> locationIds = locations.stream().map(Location::getId).toList();
        Map<UUID, Long> countByLocationId = bookRepository.countActiveBooksByLocationIds(locationIds)
                .stream()
                .collect(Collectors.toMap(BookCountProjection::getLocationId, BookCountProjection::getCount));

        return locations.stream()
                .map(location -> new LocationWithCount(location,
                        countByLocationId.getOrDefault(location.getId(), 0L).intValue()))
                .toList();
    }

    @Transactional
    public Location create(String name, UUID roomId, String description) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));
        Location location = new Location();
        location.setName(name);
        location.setDescription(description);
        location.setRoom(room);
        location.setActive(true);
        return locationRepository.save(location);
    }

    @Transactional
    public Location update(UUID id, String name, String description, Long version) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));
        if (!location.isActive()) {
            throw new ResourceNotFoundException("Location not found: " + id);
        }
        location.setName(name);
        location.setDescription(description);
        location.setVersion(version);
        return locationRepository.save(location);
    }

    @Transactional
    public void delete(UUID id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + id));
        if (bookRepository.existsByLocationAndStatusNot(location, BookStatus.DELETED)) {
            throw new ActiveChildException("Location has active books: " + id);
        }
        location.setActive(false);
        locationRepository.save(location);
    }

    private Specification<Location> buildSpec(String name, UUID roomId, String description) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("active")));
            if (name != null && !name.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
            }
            if (roomId != null) {
                predicates.add(cb.equal(root.get("room").get("id"), roomId));
            }
            if (description != null && !description.isBlank()) {
                // LOWER() on TEXT is acceptable at household scale; at high volume consider GIN index + pg_trgm
                predicates.add(cb.like(cb.lower(root.get("description")), "%" + description.toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
