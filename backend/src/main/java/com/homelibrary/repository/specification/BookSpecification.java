package com.homelibrary.repository.specification;

import com.homelibrary.dto.BookSearchParams;
import com.homelibrary.entity.Book;
import com.homelibrary.model.BookStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class BookSpecification {

    private BookSpecification() {}

    public static Specification<Book> forSearch(BookSearchParams params) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.notEqual(root.get("status"), BookStatus.DELETED));

            if (params.search() != null && !params.search().isBlank()) {
                String pattern = "%" + params.search().toLowerCase() + "%";
                Predicate titleLike = cb.like(cb.lower(root.get("title")), pattern);
                Predicate authorsLike = cb.like(cb.lower(root.get("authors")), pattern);
                predicates.add(cb.or(titleLike, authorsLike));
            }
            if (params.status() != null) {
                predicates.add(cb.equal(root.get("status"), params.status()));
            }
            if (params.locationId() != null) {
                predicates.add(cb.equal(root.get("location").get("id"), params.locationId()));
            }
            if (params.category() != null && !params.category().isBlank()) {
                String safeCategory = params.category().replace("\"", "\\\"");
                predicates.add(cb.like(root.get("categories"), "%\"" + safeCategory + "\"%"));
            }
            if (params.language() != null && !params.language().isBlank()) {
                predicates.add(cb.equal(root.get("language"), params.language()));
            }
            if (params.publishYear() != null) {
                predicates.add(cb.equal(root.get("publishYear"), params.publishYear()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
