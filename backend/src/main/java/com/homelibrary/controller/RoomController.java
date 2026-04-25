package com.homelibrary.controller;

import com.homelibrary.dto.CreateRoomRequest;
import com.homelibrary.dto.RoomResponse;
import com.homelibrary.dto.UpdateRoomRequest;
import com.homelibrary.entity.Room;
import com.homelibrary.service.RoomService;
import com.homelibrary.service.RoomWithCount;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    @Operation(summary = "List rooms with optional name filter")
    @ApiResponse(responseCode = "200", description = "Rooms returned successfully")
    @GetMapping
    @PreAuthorize("hasRole('VISITOR')")
    public ResponseEntity<Page<RoomResponse>> list(
            @RequestParam(required = false) String name,
            @PageableDefault(sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(roomService.list(name, pageable).map(this::toResponse));
    }

    @Operation(summary = "List all active rooms without pagination")
    @ApiResponse(responseCode = "200", description = "All rooms returned successfully")
    @GetMapping("/all")
    @PreAuthorize("hasRole('VISITOR')")
    public ResponseEntity<List<RoomResponse>> listAll() {
        return ResponseEntity.ok(roomService.findAll().stream().map(this::toResponse).toList());
    }

    @Operation(summary = "Create a new room")
    @ApiResponse(responseCode = "201", description = "Room created successfully")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoomResponse> create(@Valid @RequestBody CreateRoomRequest request) {
        Room room = roomService.create(request.name(), request.description());
        return ResponseEntity.status(201).body(toResponse(room, 0));
    }

    @Operation(summary = "Update an existing room")
    @ApiResponse(responseCode = "200", description = "Room updated successfully")
    @ApiResponse(responseCode = "404", description = "Room not found")
    @ApiResponse(responseCode = "409", description = "Optimistic locking conflict")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RoomResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateRoomRequest request) {
        Room room = roomService.update(id, request.name(), request.description(), request.version());
        return ResponseEntity.ok(toResponse(room, 0));
    }

    @Operation(summary = "Soft delete a room")
    @ApiResponse(responseCode = "204", description = "Room deleted successfully")
    @ApiResponse(responseCode = "404", description = "Room not found")
    @ApiResponse(responseCode = "409", description = "Room has active locations")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roomService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private RoomResponse toResponse(RoomWithCount rwc) {
        return toResponse(rwc.room(), rwc.locationCount());
    }

    private RoomResponse toResponse(Room room, int locationCount) {
        return new RoomResponse(room.getId(), room.getName(), room.getDescription(), locationCount, room.getVersion());
    }
}
