package com.homelibrary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

@SpringBootApplication
// VIA_DTO: stable Page JSON shape (content + page.{totalElements,totalPages,size,number}).
// Spring Boot may change the default Page serialization between versions — this pins it.
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
public class HomelibraryApplication {

    public static void main(String[] args) {
        SpringApplication.run(HomelibraryApplication.class, args);
    }
}
