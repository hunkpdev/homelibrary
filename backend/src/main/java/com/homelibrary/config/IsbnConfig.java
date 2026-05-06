package com.homelibrary.config;

import com.homelibrary.util.NativeLibraryLoader;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class IsbnConfig {

    @Bean
    public NativeLibraryLoader nativeLibraryLoader() {
        return new NativeLibraryLoader(IsbnConfig.class.getClassLoader(), System::load);
    }
}
