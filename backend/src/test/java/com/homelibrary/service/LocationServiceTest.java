package com.homelibrary.service;

import com.homelibrary.entity.Location;
import com.homelibrary.entity.Room;
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
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
    @SuppressWarnings("unchecked")
    void findAll_returnsAllActiveLocations() {
        Location loc = locationWithName("Left Shelf");

        when(locationRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(loc));

        List<LocationWithCount> result = locationService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).location().getName()).isEqualTo("Left Shelf");
        assertThat(result.get(0).bookCount()).isZero();
    }

    @Test
    void create_validRequest_savesAndReturnsLocation() {
        UUID roomId = UUID.randomUUID();
        Room room = new Room();
        room.setId(roomId);
        room.setName("Library");
        room.setActive(true);

        Location saved = locationWithName("Left Shelf");
        saved.setRoom(room);

        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(locationRepository.save(any())).thenReturn(saved);

        Location result = locationService.create("Left Shelf", roomId, null);

        assertThat(result.getName()).isEqualTo("Left Shelf");
        assertThat(result.getRoom().getId()).isEqualTo(roomId);
    }

    @Test
    void create_nonExistentRoomId_throwsResourceNotFoundException() {
        UUID roomId = UUID.randomUUID();
        when(roomRepository.findById(roomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> locationService.create("Left Shelf", roomId, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_inactiveLocation_throwsResourceNotFoundException() {
        Location location = locationWithName("Left Shelf");
        location.setActive(false);
        UUID id = location.getId();
        when(locationRepository.findById(id)).thenReturn(Optional.of(location));

        assertThatThrownBy(() -> locationService.update(id, "New Name", null, 0L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(locationRepository, never()).save(any());
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

    @Test
    void update_validRequest_updatesAndReturnsLocation() {
        Location location = locationWithName("Left Shelf");
        UUID id = location.getId();
        when(locationRepository.findById(id)).thenReturn(Optional.of(location));
        when(locationRepository.save(any())).thenReturn(location);

        Location result = locationService.update(id, "New Name", "New Desc", 0L);

        assertThat(result.getName()).isEqualTo("New Name");
        verify(locationRepository).save(location);
    }

    @Test
    void update_nonExistentLocation_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(locationRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> locationService.update(id, "New Name", null, 0L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(locationRepository, never()).save(any());
    }

    @Test
    void delete_validId_deactivatesLocation() {
        Location location = locationWithName("Left Shelf");
        UUID id = location.getId();
        when(locationRepository.findById(id)).thenReturn(Optional.of(location));

        locationService.delete(id);

        assertThat(location.isActive()).isFalse();
        verify(locationRepository).save(location);
    }

    @Test
    void delete_nonExistentId_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(locationRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> locationService.delete(id))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(locationRepository, never()).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void buildSpec_noFilters_onlyChecksActive() {
        Root<Location> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Boolean> activePath = mock(Path.class);
        Predicate activePredicate = mock(Predicate.class);
        Predicate andPredicate = mock(Predicate.class);

        doReturn(activePath).when(root).get("active");
        when(cb.isTrue(activePath)).thenReturn(activePredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        ArgumentCaptor<Specification<Location>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        when(locationRepository.findAll(specCaptor.capture(), any(Sort.class))).thenReturn(List.of());

        locationService.findAll();

        Predicate result = specCaptor.getValue().toPredicate(root, query, cb);
        assertThat(result).isEqualTo(andPredicate);
        verify(cb).isTrue(activePath);
    }

    @Test
    @SuppressWarnings("unchecked")
    void buildSpec_withNameFilter_addsNameLikePredicate() {
        Root<Location> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Boolean> activePath = mock(Path.class);
        Path<String> namePath = mock(Path.class);
        Expression<String> lowerExpr = mock(Expression.class);
        Predicate activePredicate = mock(Predicate.class);
        Predicate namePredicate = mock(Predicate.class);
        Predicate andPredicate = mock(Predicate.class);

        doReturn(activePath).when(root).get("active");
        doReturn(namePath).when(root).get("name");
        when(cb.isTrue(activePath)).thenReturn(activePredicate);
        when(cb.lower(namePath)).thenReturn(lowerExpr);
        when(cb.like(lowerExpr, "%shelf%")).thenReturn(namePredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        ArgumentCaptor<Specification<Location>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        Pageable pageable = PageRequest.of(0, 20);
        when(locationRepository.findAll(specCaptor.capture(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        locationService.list("Shelf", null, null, pageable);

        specCaptor.getValue().toPredicate(root, query, cb);
        verify(cb).like(lowerExpr, "%shelf%");
    }

    @Test
    @SuppressWarnings("unchecked")
    void buildSpec_withDescriptionFilter_addsDescriptionLikePredicate() {
        Root<Location> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Boolean> activePath = mock(Path.class);
        Path<String> descPath = mock(Path.class);
        Expression<String> lowerExpr = mock(Expression.class);
        Predicate activePredicate = mock(Predicate.class);
        Predicate descPredicate = mock(Predicate.class);
        Predicate andPredicate = mock(Predicate.class);

        doReturn(activePath).when(root).get("active");
        doReturn(descPath).when(root).get("description");
        when(cb.isTrue(activePath)).thenReturn(activePredicate);
        when(cb.lower(descPath)).thenReturn(lowerExpr);
        when(cb.like(lowerExpr, "%wooden%")).thenReturn(descPredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        ArgumentCaptor<Specification<Location>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        Pageable pageable = PageRequest.of(0, 20);
        when(locationRepository.findAll(specCaptor.capture(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        locationService.list(null, null, "wooden", pageable);

        specCaptor.getValue().toPredicate(root, query, cb);
        verify(cb).like(lowerExpr, "%wooden%");
    }

    @Test
    @SuppressWarnings("unchecked")
    void buildSpec_withRoomIdFilter_addsRoomIdEqualPredicate() {
        Root<Location> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Boolean> activePath = mock(Path.class);
        Path<Object> roomPath = mock(Path.class);
        Path<Object> roomIdPath = mock(Path.class);
        Predicate activePredicate = mock(Predicate.class);
        Predicate roomPredicate = mock(Predicate.class);
        Predicate andPredicate = mock(Predicate.class);

        UUID roomId = UUID.randomUUID();
        doReturn(activePath).when(root).get("active");
        doReturn(roomPath).when(root).get("room");
        doReturn(roomIdPath).when(roomPath).get("id");
        when(cb.isTrue(activePath)).thenReturn(activePredicate);
        when(cb.equal(roomIdPath, roomId)).thenReturn(roomPredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

        ArgumentCaptor<Specification<Location>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        Pageable pageable = PageRequest.of(0, 20);
        when(locationRepository.findAll(specCaptor.capture(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        locationService.list(null, roomId, null, pageable);

        specCaptor.getValue().toPredicate(root, query, cb);
        verify(cb).equal(roomIdPath, roomId);
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
