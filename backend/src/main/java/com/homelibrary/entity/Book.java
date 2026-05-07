package com.homelibrary.entity;

import com.homelibrary.model.BookSource;
import com.homelibrary.model.BookStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "books")
public class Book extends BaseEntity {

    @Column(unique = true)
    private String isbn;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(length = 500)
    private String subtitle;

    @Column(length = 1000)
    private String authors;

    @Column(length = 255)
    private String publisher;

    private Integer publishYear;

    private Integer pageCount;

    @Column(length = 10)
    private String language;

    @Column(length = 500)
    private String categories;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String coverImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BookSource source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by")
    private User addedBy;

    private OffsetDateTime deletedAt;
}
