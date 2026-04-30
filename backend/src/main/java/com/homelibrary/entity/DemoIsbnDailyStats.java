package com.homelibrary.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "demo_isbn_daily_stats")
@Getter
@Setter
@NoArgsConstructor
public class DemoIsbnDailyStats {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lookup_date", nullable = false)
    private LocalDate lookupDate;

    @Column(name = "lookup_count", nullable = false)
    private int lookupCount;
}
