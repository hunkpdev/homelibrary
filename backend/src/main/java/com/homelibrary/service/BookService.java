package com.homelibrary.service;

import com.homelibrary.dto.BookCreateRequest;
import com.homelibrary.dto.BookLocationResponse;
import com.homelibrary.dto.BookResponse;
import com.homelibrary.dto.BookRoomResponse;
import com.homelibrary.dto.BookSearchParams;
import com.homelibrary.dto.BookUpdateRequest;
import com.homelibrary.entity.Book;
import com.homelibrary.entity.Location;
import com.homelibrary.exception.ResourceNotFoundException;
import com.homelibrary.model.BookStatus;
import com.homelibrary.repository.BookRepository;
import com.homelibrary.repository.LocationRepository;
import com.homelibrary.repository.UserRepository;
import com.homelibrary.repository.specification.BookSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
@Service
public class BookService {

    public static final String BOOK_NOT_FOUND = "Book not found: ";
    private final BookRepository bookRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final ModelMapper modelMapper;

    @Transactional
    public BookResponse create(BookCreateRequest request, UUID addedByUserId) {
        Book book = modelMapper.map(request, Book.class);
        book.setStatus(BookStatus.AT_HOME);
        if (request.locationId() != null) {
            book.setLocation(getLocation(request.locationId()));
        }
        userRepository.findById(addedByUserId).ifPresent(book::setAddedBy);
        return toResponse(bookRepository.save(book));
    }

    @Transactional(readOnly = true)
    public BookResponse getById(UUID id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(BOOK_NOT_FOUND + id));
        return toResponse(book);
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> search(BookSearchParams params, Pageable pageable) {
        return bookRepository.findAll(BookSpecification.forSearch(params), pageable)
                .map(this::toResponse);
    }

    @Transactional
    public BookResponse update(UUID id, BookUpdateRequest request) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(BOOK_NOT_FOUND + id));
        modelMapper.map(request, book);
        book.setVersion(request.version());
        book.setLocation(request.locationId() != null ? getLocation(request.locationId()) : null);
        return toResponse(bookRepository.save(book));
    }

    @Transactional
    public void softDelete(UUID id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(BOOK_NOT_FOUND + id));
        book.setStatus(BookStatus.DELETED);
        book.setDeletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        bookRepository.save(book);
    }

    private Location getLocation(UUID locationId) {
        return locationRepository.findById(locationId)
                .filter(Location::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found: " + locationId));
    }

    private BookResponse toResponse(Book book) {
        return new BookResponse(
                book.getId(),
                book.getIsbn(),
                book.getTitle(),
                book.getSubtitle(),
                book.getAuthors(),
                book.getPublisher(),
                book.getPublishYear(),
                book.getPageCount(),
                book.getLanguage(),
                book.getCategories(),
                book.getDescription(),
                book.getCoverImageUrl(),
                book.getStatus(),
                getBookLocationResponse(book.getLocation()),
                book.getSource(),
                book.getVersion(),
                book.getCreatedAt(),
                book.getUpdatedAt()
        );
    }

    private static BookLocationResponse getBookLocationResponse(Location location) {
        if (location != null) {
            BookRoomResponse roomResponse = location.getRoom() != null
                    ? new BookRoomResponse(location.getRoom().getId(), location.getRoom().getName())
                    : null;
            return new BookLocationResponse(location.getId(), location.getName(), roomResponse);
        }
        return null;
    }
}
