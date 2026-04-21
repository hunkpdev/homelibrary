package com.homelibrary.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateLocationRequest {

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotNull
    private Long version;

    @Size(max = 2000)
    private String description;

    @JsonAnySetter
    public void handleUnknown(String key, Object value) {
        throw new IllegalArgumentException("Unexpected field: " + key);
    }
}
