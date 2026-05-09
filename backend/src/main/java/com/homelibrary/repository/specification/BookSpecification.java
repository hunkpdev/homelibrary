package com.homelibrary.repository.specification;

import com.homelibrary.dto.BookSearchParams;
import com.homelibrary.entity.Book;
import com.homelibrary.model.BookStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class BookSpecification {

    private BookSpecification() {}

    public static Specification<Book> forSearch(BookSearchParams params) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.notEqual(root.get("status"), BookStatus.DELETED));
            addEqualsPredicates(params, root, cb, predicates);
            addContainsPredicates(params, root, cb, predicates);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addEqualsPredicates(BookSearchParams params, Root<Book> root, CriteriaBuilder cb, List<Predicate> predicates) {
        if (params.status() != null) {
            predicates.add(cb.equal(root.get("status"), params.status()));
        }
        if (params.locationId() != null) {
            predicates.add(cb.equal(root.get("location").get("id"), params.locationId()));
        }
        if (StringUtils.hasText(params.language())) {
            predicates.add(cb.equal(root.get("language"), params.language()));
        }
    }

    private static void addContainsPredicates(BookSearchParams params, Root<Book> root, CriteriaBuilder cb, List<Predicate> predicates) {
        if (StringUtils.hasText(params.isbn())) {
            predicates.add(cb.like(cb.lower(root.get("isbn")), params.isbn().toLowerCase() + "%"));
        }
        if (StringUtils.hasText(params.title())) {
            predicates.add(cb.like(cb.lower(root.get("title")), "%" + params.title().toLowerCase() + "%"));
        }
        if (StringUtils.hasText(params.authors())) {
            predicates.add(cb.like(cb.lower(root.get("authors").as(String.class)), "%" + params.authors().toLowerCase() + "%"));
        }
        if (StringUtils.hasText(params.category())) {
            predicates.add(cb.like(cb.lower(root.get("categories").as(String.class)), "%" + params.category().toLowerCase() + "%"));
        }
        if (StringUtils.hasText(params.publishYear())) {
            predicates.add(cb.like(root.get("publishYear").as(String.class), params.publishYear() + "%"));
        }
    }
}
