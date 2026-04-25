package com.homelibrary.controller;

import com.homelibrary.dto.CreateLocationRequest;
import com.homelibrary.dto.EmbeddedRoomSummary;
import com.homelibrary.dto.LocationResponse;
import com.homelibrary.dto.UpdateLocationRequest;
import com.homelibrary.entity.Location;
import com.homelibrary.service.LocationService;
import com.homelibrary.service.LocationWithCount;
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
@RequestMapping("/api/locations")
public class LocationController {

    private final LocationService locationService;

    @Operation(summary = "List locations with optional name and room filters")
    @ApiResponse(responseCode = "200", description = "Locations returned successfully")
    @GetMapping
    @PreAuthorize("hasRole('VISITOR')")
    public ResponseEntity<Page<LocationResponse>> list(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) UUID roomId,
            @RequestParam(required = false) String description,
            @PageableDefault(sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(locationService.list(name, roomId, description, pageable).map(this::toResponse));
    }

    @Operation(summary = "List all active locations without pagination")
    @ApiResponse(responseCode = "200", description = "All locations returned successfully")
    @GetMapping("/all")
    @PreAuthorize("hasRole('VISITOR')")
    public ResponseEntity<List<LocationResponse>> listAll() {
        return ResponseEntity.ok(locationService.findAll().stream().map(this::toResponse).toList());
    }

    @Operation(summary = "Create a new location")
    @ApiResponse(responseCode = "201", description = "Location created successfully")
    @ApiResponse(responseCode = "400", description = "Validation error")
    @ApiResponse(responseCode = "404", description = "Room not found")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LocationResponse> create(@Valid @RequestBody CreateLocationRequest request) {
        Location location = locationService.create(request.name(), request.roomId(), request.description());
        return ResponseEntity.status(201).body(toResponse(location, 0));
    }

    @Operation(summary = "Update an existing location")
    @ApiResponse(responseCode = "200", description = "Location updated successfully")
    @ApiResponse(responseCode = "400", description = "Validation error or unknown field (e.g. roomId)")
    @ApiResponse(responseCode = "404", description = "Location not found")
    @ApiResponse(responseCode = "409", description = "Optimistic locking conflict")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LocationResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateLocationRequest request) {
        Location location = locationService.update(id, request.name(), request.description(), request.version());
        return ResponseEntity.ok(toResponse(location, 0));
    }

    @Operation(summary = "Soft delete a location")
    @ApiResponse(responseCode = "204", description = "Location deleted successfully")
    @ApiResponse(responseCode = "404", description = "Location not found")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        locationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private LocationResponse toResponse(LocationWithCount lwc) {
        return toResponse(lwc.location(), lwc.bookCount());
    }

    private LocationResponse toResponse(Location location, int bookCount) {
        EmbeddedRoomSummary room = new EmbeddedRoomSummary(
                location.getRoom().getId(),
                location.getRoom().getName()
        );
        return new LocationResponse(location.getId(), location.getName(), location.getDescription(), room, bookCount, location.getVersion());
    }
}
