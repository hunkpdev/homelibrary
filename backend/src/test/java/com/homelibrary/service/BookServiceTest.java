package com.homelibrary.service;

import com.homelibrary.dto.BookCreateRequest;
import com.homelibrary.dto.BookResponse;
import com.homelibrary.dto.BookSearchParams;
import com.homelibrary.dto.BookUpdateRequest;
import com.homelibrary.entity.Book;
import com.homelibrary.entity.Location;
import com.homelibrary.entity.Room;
import com.homelibrary.exception.ResourceNotFoundException;
import com.homelibrary.model.BookStatus;
import com.homelibrary.repository.BookRepository;
import com.homelibrary.repository.LocationRepository;
import com.homelibrary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock
    private BookRepository bookRepository;
    @Mock
    private LocationRepository locationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ModelMapper modelMapper;

    private BookService bookService;

    @BeforeEach
    void setUp() {
        bookService = new BookService(bookRepository, locationRepository, userRepository, modelMapper);
    }

    @Test
    void create_noLocation_savesBookWithAtHomeStatus() {
        BookCreateRequest request = new BookCreateRequest(
                null, "Clean Code", null, List.of("Robert Martin"),
                null, null, null, null, null, null, null, null
        );
        UUID userId = UUID.randomUUID();

        Book saved = bookWithTitle("Clean Code");
        saved.setStatus(BookStatus.AT_HOME);
        when(modelMapper.map(request, Book.class)).thenReturn(new Book());
        when(bookRepository.save(any())).thenReturn(saved);

        BookResponse result = bookService.create(request, userId);

        assertThat(result.title()).isEqualTo("Clean Code");
        assertThat(result.status()).isEqualTo(BookStatus.AT_HOME);
        verify(locationRepository, never()).findById(any());
    }

    @Test
    void create_withValidLocation_setsLocation() {
        UUID locationId = UUID.randomUUID();
        Location location = activeLocation("Left Shelf");
        location.setId(locationId);

        BookCreateRequest request = new BookCreateRequest(
                null, "Clean Code", null, null,
                null, null, null, null, null, null, locationId, null
        );
        UUID userId = UUID.randomUUID();

        Book saved = bookWithTitle("Clean Code");
        saved.setLocation(location);
        saved.setStatus(BookStatus.AT_HOME);

        when(locationRepository.findById(locationId)).thenReturn(Optional.of(location));
        when(modelMapper.map(request, Book.class)).thenReturn(new Book());
        when(bookRepository.save(any())).thenReturn(saved);

        BookResponse result = bookService.create(request, userId);

        assertThat(result.location()).isNotNull();
        assertThat(result.location().id()).isEqualTo(locationId);
    }

    @Test
    void create_locationNotFound_throwsResourceNotFoundException() {
        UUID locationId = UUID.randomUUID();
        BookCreateRequest request = new BookCreateRequest(
                null, "Clean Code", null, null,
                null, null, null, null, null, null, locationId, null
        );

        when(locationRepository.findById(locationId)).thenReturn(Optional.empty());
        when(modelMapper.map(request, Book.class)).thenReturn(new Book());

        UUID addedByUserId = UUID.randomUUID();
        assertThatThrownBy(() -> bookService.create(request, addedByUserId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bookRepository, never()).save(any());
    }

    @Test
    void create_inactiveLocation_throwsResourceNotFoundException() {
        UUID locationId = UUID.randomUUID();
        Location inactive = activeLocation("Left Shelf");
        inactive.setId(locationId);
        inactive.setActive(false);

        BookCreateRequest request = new BookCreateRequest(
                null, "Clean Code", null, null,
                null, null, null, null, null, null, locationId, null
        );

        when(locationRepository.findById(locationId)).thenReturn(Optional.of(inactive));
        when(modelMapper.map(request, Book.class)).thenReturn(new Book());

        UUID addedByUserId = UUID.randomUUID();
        assertThatThrownBy(() -> {
            bookService.create(request, addedByUserId);
        }).isInstanceOf(ResourceNotFoundException.class);

        verify(bookRepository, never()).save(any());
    }

    @Test
    void getById_found_returnsBookResponse() {
        Book book = bookWithTitle("Clean Code");
        UUID id = book.getId();
        when(bookRepository.findById(id)).thenReturn(Optional.of(book));

        BookResponse result = bookService.getById(id);

        assertThat(result.id()).isEqualTo(id);
        assertThat(result.title()).isEqualTo("Clean Code");
    }

    @Test
    void getById_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(bookRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookService.getById(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void search_returnsPageOfBookResponses() {
        Book book = bookWithTitle("Clean Code");
        Pageable pageable = PageRequest.of(0, 20);
        Page<Book> page = new PageImpl<>(List.of(book), pageable, 1);
        BookSearchParams params = new BookSearchParams(null, null, null, null, null, null);

        when(bookRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        Page<BookResponse> result = bookService.search(params, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).title()).isEqualTo("Clean Code");
    }

    @Test
    void update_found_updatesBook() {
        Book book = bookWithTitle("Old Title");
        UUID id = book.getId();
        BookUpdateRequest request = new BookUpdateRequest(
                null, "New Title", null, null,
                null, null, null, null, null, null, null, null, 0L
        );

        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(bookRepository.save(any())).thenReturn(book);

        doAnswer(invocation -> {
            BookUpdateRequest req = invocation.getArgument(0);
            Book bookEntity = invocation.getArgument(1);
            bookEntity.setTitle(req.title());
            return null;
        }).when(modelMapper).map(any(BookUpdateRequest.class), any(Book.class));

        BookResponse result = bookService.update(id, request);

        assertThat(result.title()).isEqualTo("New Title");
        verify(bookRepository).save(book);
    }

    @Test
    void update_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(bookRepository.findById(id)).thenReturn(Optional.empty());

        BookUpdateRequest request = new BookUpdateRequest(
                null, "New Title", null, null,
                null, null, null, null, null, null, null, null, 0L
        );

        assertThatThrownBy(() -> bookService.update(id, request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bookRepository, never()).save(any());
    }

    @Test
    void update_versionConflict_throwsObjectOptimisticLockingFailureException() {
        Book book = bookWithTitle("Clean Code");
        UUID id = book.getId();
        BookUpdateRequest request = new BookUpdateRequest(
                null, "Clean Code", null, null,
                null, null, null, null, null, null, null, null, 0L
        );

        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(bookRepository.save(any())).thenThrow(new ObjectOptimisticLockingFailureException(Book.class, id));

        assertThatThrownBy(() -> bookService.update(id, request))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    @Test
    void update_withNewLocation_loadsAndSetsLocation() {
        UUID locationId = UUID.randomUUID();
        Location location = activeLocation("New Shelf");
        location.setId(locationId);

        Book book = bookWithTitle("Clean Code");
        UUID id = book.getId();
        BookUpdateRequest request = new BookUpdateRequest(
                null, "Clean Code", null, null,
                null, null, null, null, null, null, locationId, null, 0L
        );

        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(locationRepository.findById(locationId)).thenReturn(Optional.of(location));
        when(bookRepository.save(any())).thenReturn(book);

        bookService.update(id, request);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getLocation()).isEqualTo(location);
    }

    @Test
    void update_locationSetToNull_clearsLocation() {
        Book book = bookWithTitle("Clean Code");
        book.setLocation(activeLocation("Old Shelf"));
        UUID id = book.getId();
        BookUpdateRequest request = new BookUpdateRequest(
                null, "Clean Code", null, null,
                null, null, null, null, null, null, null, null, 0L
        );

        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(bookRepository.save(any())).thenReturn(book);

        bookService.update(id, request);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getLocation()).isNull();
    }

    @Test
    void softDelete_found_setsDeletedStatusAndTimestamp() {
        Book book = bookWithTitle("Clean Code");
        book.setStatus(BookStatus.AT_HOME);
        UUID id = book.getId();

        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(bookRepository.save(any())).thenReturn(book);

        bookService.softDelete(id);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(BookStatus.DELETED);
        assertThat(captor.getValue().getDeletedAt()).isNotNull();
    }

    @Test
    void softDelete_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(bookRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookService.softDelete(id))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bookRepository, never()).save(any());
    }

    @Test
    void toResponse_authorsAndCategories_convertedFromJson() {
        Book book = bookWithTitle("Clean Code");
        book.setAuthors(List.of("Robert Martin", "Uncle Bob"));
        book.setCategories(List.of("Software Engineering"));
        when(bookRepository.findById(book.getId())).thenReturn(Optional.of(book));

        BookResponse result = bookService.getById(book.getId());

        assertThat(result.authors()).containsExactly("Robert Martin", "Uncle Bob");
        assertThat(result.categories()).containsExactly("Software Engineering");
    }

    @Test
    void updateStatus_found_updatesStatus() {
        Book book = bookWithTitle("Clean Code");
        UUID id = book.getId();
        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(bookRepository.save(any())).thenReturn(book);

        BookResponse result = bookService.updateStatus(id, BookStatus.LOANED);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(BookStatus.LOANED);
        assertThat(result).isNotNull();
    }

    @Test
    void updateStatus_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(bookRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookService.updateStatus(id, BookStatus.LOANED))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bookRepository, never()).save(any());
    }

    @Test
    void updateLocation_found_setsNewLocation() {
        UUID locationId = UUID.randomUUID();
        Location location = activeLocation("New Shelf");
        location.setId(locationId);

        Book book = bookWithTitle("Clean Code");
        UUID id = book.getId();

        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(locationRepository.findById(locationId)).thenReturn(Optional.of(location));
        when(bookRepository.save(any())).thenReturn(book);

        bookService.updateLocation(id, locationId);

        ArgumentCaptor<Book> captor = ArgumentCaptor.forClass(Book.class);
        verify(bookRepository).save(captor.capture());
        assertThat(captor.getValue().getLocation()).isEqualTo(location);
    }

    @Test
    void updateLocation_locationNotFound_throwsResourceNotFoundException() {
        UUID locationId = UUID.randomUUID();
        Book book = bookWithTitle("Clean Code");
        UUID id = book.getId();

        when(bookRepository.findById(id)).thenReturn(Optional.of(book));
        when(locationRepository.findById(locationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookService.updateLocation(id, locationId))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bookRepository, never()).save(any());
    }

    private Book bookWithTitle(String title) {
        Book book = new Book();
        book.setId(UUID.randomUUID());
        book.setTitle(title);
        book.setStatus(BookStatus.AT_HOME);
        book.setVersion(0L);
        return book;
    }

    private Location activeLocation(String name) {
        Room room = new Room();
        room.setId(UUID.randomUUID());
        room.setName("Library");

        Location location = new Location();
        location.setId(UUID.randomUUID());
        location.setName(name);
        location.setActive(true);
        location.setRoom(room);
        return location;
    }
}
