package com.homelibrary.service;

import com.homelibrary.entity.Location;
import com.homelibrary.exception.ResourceNotFoundException;
import com.homelibrary.repository.LocationRepository;
import com.homelibrary.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationServiceTest {

    @Mock
    private LocationRepository locationRepository;
    @Mock
    private RoomRepository roomRepository;

    private LocationService locationService;

    @BeforeEach
    void setUp() {
        locationService = new LocationService(locationRepository, roomRepository);
    }

    @Test
    @SuppressWarnings("unchecked")
    void list_noFilters_returnsAllActiveLocations() {
        Location loc1 = locationWithName("Left Shelf");
        Location loc2 = locationWithName("Right Shelf");
        Pageable pageable = PageRequest.of(0, 20);
        Page<Location> page = new PageImpl<>(List.of(loc1, loc2), pageable, 2);

        when(locationRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        Page<LocationWithCount> result = locationService.list(null, null, null, pageable);

        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).extracting(lwc -> lwc.location().getName())
                .containsExactly("Left Shelf", "Right Shelf");
        assertThat(result.getContent()).allMatch(lwc -> lwc.bookCount() == 0);
    }

    @Test
    @SuppressWarnings("unchecked")
    void list_withRoomIdFilter_returnsLocationsForThatRoom() {
        UUID roomId = UUID.randomUUID();
        Location loc = locationWithName("Left Shelf");
        Pageable pageable = PageRequest.of(0, 20);
        Page<Location> page = new PageImpl<>(List.of(loc), pageable, 1);

        when(locationRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        Page<LocationWithCount> result = locationService.list(null, roomId, null, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).location().getName()).isEqualTo("Left Shelf");
    }

    @Test
    void create_nonExistentRoomId_throwsResourceNotFoundException() {
        UUID roomId = UUID.randomUUID();
        when(roomRepository.findById(roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> locationService.create("Left Shelf", roomId, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_versionConflict_throwsObjectOptimisticLockingFailureException() {
        Location location = locationWithName("Left Shelf");
        UUID id = location.getId();
        when(locationRepository.findById(id)).thenReturn(Optional.of(location));
        when(locationRepository.save(any())).thenThrow(new ObjectOptimisticLockingFailureException(Location.class, id));

        assertThatThrownBy(() -> locationService.update(id, "New Name", null, 0L))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    private Location locationWithName(String name) {
        Location location = new Location();
        location.setId(UUID.randomUUID());
        location.setName(name);
        location.setActive(true);
        location.setVersion(0L);
        return location;
    }
}
