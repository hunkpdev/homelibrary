package com.homelibrary.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.File;

@Slf4j
@Profile("local")
@Component
public class LocalDataSeeder implements ApplicationRunner {
    private static final String SEED_FILE_PATH = "local-data/seed.sql";
    private final DataSource dataSource;

    public LocalDataSeeder(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(@NonNull ApplicationArguments args) {
        File seedFile = new File(SEED_FILE_PATH);
        if (!seedFile.exists()) {
            return;
        }
        new ResourceDatabasePopulator(new FileSystemResource(seedFile)).execute(dataSource);
        log.info("Local seed data loaded from {}", SEED_FILE_PATH);
    }
}
