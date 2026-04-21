package com.homelibrary.service;

import com.homelibrary.entity.Room;
import com.homelibrary.exception.ActiveChildException;
import com.homelibrary.exception.ResourceNotFoundException;
import com.homelibrary.repository.LocationRepository;
import com.homelibrary.repository.RoomRepository;
import com.homelibrary.repository.projection.LocationCountProjection;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private LocationRepository locationRepository;

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        roomService = new RoomService(roomRepository, locationRepository);
    }

    @Test
    @SuppressWarnings("unchecked")
    void list_noFilter_returnsAllActiveRooms() {
        Room room1 = roomWithName("Library");
        Room room2 = roomWithName("Office");
        Pageable pageable = PageRequest.of(0, 20);
        Page<Room> page = new PageImpl<>(List.of(room1, room2), pageable, 2);

        when(roomRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(locationRepository.countActiveLocationsByRoomIds(any())).thenReturn(List.of());

        Page<RoomWithCount> result = roomService.list(null, pageable);

        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).extracting(rwc -> rwc.room().getName())
                .containsExactly("Library", "Office");
    }

    @Test
    void delete_roomWithActiveLocations_throwsActiveChildException() {
        Room room = roomWithName("Library");
        when(roomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(locationRepository.existsByRoomAndActiveTrue(room)).thenReturn(true);

        assertThatThrownBy(() -> roomService.delete(room.getId()))
                .isInstanceOf(ActiveChildException.class);

        verify(roomRepository, never()).save(any());
    }

    @Test
    void delete_roomNotFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(roomRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roomService.delete(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_versionConflict_throwsObjectOptimisticLockingFailureException() {
        Room room = roomWithName("Library");
        when(roomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(roomRepository.save(any())).thenThrow(new ObjectOptimisticLockingFailureException(Room.class, room.getId()));

        assertThatThrownBy(() -> roomService.update(room.getId(), "New Name", null, 0L))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void list_withLocationCounts_mapsCountsCorrectly() {
        Room room = roomWithName("Library");
        Pageable pageable = PageRequest.of(0, 20);
        Page<Room> page = new PageImpl<>(List.of(room), pageable, 1);

        LocationCountProjection projection = new LocationCountProjection() {
            public UUID getRoomId() { return room.getId(); }
            public Long getCount() { return 3L; }
        };

        when(roomRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(locationRepository.countActiveLocationsByRoomIds(List.of(room.getId()))).thenReturn(List.of(projection));

        Page<RoomWithCount> result = roomService.list(null, pageable);

        assertThat(result.getContent().get(0).locationCount()).isEqualTo(3);
    }

    private Room roomWithName(String name) {
        Room room = new Room();
        room.setId(UUID.randomUUID());
        room.setName(name);
        room.setActive(true);
        room.setVersion(0L);
        return room;
    }
}
