package com.homelibrary.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.homelibrary.model.IsbnSource;
import lombok.Data;

import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class IsbnLookupResponse {
    private String isbn;
    private String title;
    private String subtitle;
    private List<String> authors;
    private String publisher;
    private Integer publishYear;
    private Integer pageCount;
    private String language;
    private IsbnSource source;
    private boolean found;
    private Boolean rateLimitExceeded;
}
