package com.homelibrary.entity;

import com.homelibrary.model.BookSource;
import com.homelibrary.model.BookStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;

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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(length = 1000)
    private List<String> authors;

    @Column(length = 255)
    private String publisher;

    private Integer publishYear;

    private Integer pageCount;

    @Column(length = 10)
    private String language;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(length = 500)
    private List<String> categories;

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
