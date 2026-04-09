package com.homelibrary.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.hsqldb.Server;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("local")
public class HsqlServerConfig {

    private Server hsqlServer;

    @PostConstruct
    public void start() {
        hsqlServer = new Server();
        hsqlServer.setDatabaseName(0, "homelibrary");
        hsqlServer.setDatabasePath(0, "mem:homelibrary");
        hsqlServer.setPort(9001);
        hsqlServer.setSilent(true);
        hsqlServer.start();
    }

    @PreDestroy
    public void stop() {
        if (hsqlServer != null) {
            hsqlServer.stop();
        }
    }
}
