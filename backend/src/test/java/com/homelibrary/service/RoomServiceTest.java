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
import org.springframework.data.domain.Sort;
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
    @SuppressWarnings("unchecked")
    void findAll_returnsAllActiveRoomsWithCounts() {
        Room room = roomWithName("Library");
        LocationCountProjection projection = new LocationCountProjection() {
            public UUID getRoomId() { return room.getId(); }
            public Long getCount() { return 2L; }
        };

        when(roomRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(room));
        when(locationRepository.countActiveLocationsByRoomIds(List.of(room.getId()))).thenReturn(List.of(projection));

        List<RoomWithCount> result = roomService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).locationCount()).isEqualTo(2);
    }

    @Test
    void delete_roomWithActiveLocations_throwsActiveChildException() {
        Room room = roomWithName("Library");
        UUID id = room.getId();
        when(roomRepository.findById(id)).thenReturn(Optional.of(room));
        when(locationRepository.existsByRoomAndActiveTrue(room)).thenReturn(true);

        assertThatThrownBy(() -> roomService.delete(id))
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
    void update_inactiveRoom_throwsResourceNotFoundException() {
        Room room = roomWithName("Library");
        room.setActive(false);
        UUID id = room.getId();
        when(roomRepository.findById(id)).thenReturn(Optional.of(room));

        assertThatThrownBy(() -> roomService.update(id, "New Name", null, 0L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(roomRepository, never()).save(any());
    }

    @Test
    void update_versionConflict_throwsObjectOptimisticLockingFailureException() {
        Room room = roomWithName("Library");
        UUID id = room.getId();
        when(roomRepository.findById(id)).thenReturn(Optional.of(room));
        when(roomRepository.save(any())).thenThrow(new ObjectOptimisticLockingFailureException(Room.class, id));

        assertThatThrownBy(() -> roomService.update(id, "New Name", null, 0L))
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

    @Test
    void create_validRequest_savesAndReturnsRoom() {
        Room room = roomWithName("Library");
        when(roomRepository.save(any())).thenReturn(room);

        Room result = roomService.create("Library", null);

        assertThat(result.getName()).isEqualTo("Library");
        verify(roomRepository).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void findAll_empty_returnsEmptyList() {
        when(roomRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        List<RoomWithCount> result = roomService.findAll();

        assertThat(result).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void list_emptyPage_returnsEmptyPage() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Room> emptyPage = new PageImpl<>(List.of(), pageable, 0);
        when(roomRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);

        Page<RoomWithCount> result = roomService.list(null, pageable);

        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void delete_success_deactivatesRoom() {
        Room room = roomWithName("Library");
        UUID id = room.getId();
        when(roomRepository.findById(id)).thenReturn(Optional.of(room));
        when(locationRepository.existsByRoomAndActiveTrue(room)).thenReturn(false);

        roomService.delete(id);

        assertThat(room.isActive()).isFalse();
        verify(roomRepository).save(room);
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
