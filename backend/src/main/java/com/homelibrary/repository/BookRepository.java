package com.homelibrary.repository;

import com.homelibrary.entity.Book;
import com.homelibrary.entity.Location;
import com.homelibrary.model.BookStatus;
import com.homelibrary.repository.projection.BookCountProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID>, JpaSpecificationExecutor<Book> {

    boolean existsByLocationAndStatusNot(Location location, BookStatus status);

    @Query("SELECT b.location.id AS locationId, COUNT(b) AS count FROM Book b WHERE b.status <> com.homelibrary.model.BookStatus.DELETED AND b.location.id IN :locationIds GROUP BY b.location.id")
    List<BookCountProjection> countActiveBooksByLocationIds(@Param("locationIds") List<UUID> locationIds);
}
