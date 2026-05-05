package com.homelibrary.util;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Set;

@Slf4j
public class NativeLibraryLoader {

    @FunctionalInterface
    public interface SystemLoader {
        void load(String absolutePath);
    }

    private final ClassLoader classLoader;
    private final SystemLoader systemLoader;

    public NativeLibraryLoader(ClassLoader classLoader, SystemLoader systemLoader) {
        this.classLoader = classLoader;
        this.systemLoader = systemLoader;
    }

    public void load(String resourcePath, String tempSuffix) {
        try (InputStream is = classLoader.getResourceAsStream(resourcePath)) {
            if (is == null) {
                log.warn("Native library not found in classpath at {}", resourcePath);
                return;
            }
            Path tempDir = createSecureTempDir();
            tempDir.toFile().deleteOnExit();
            Path tempFile = Files.createTempFile(tempDir, "yaz_native_", tempSuffix);
            tempFile.toFile().deleteOnExit();
            Files.copy(is, tempFile, StandardCopyOption.REPLACE_EXISTING);
            systemLoader.load(tempFile.toAbsolutePath().toString());
            log.info("Loaded native library from classpath: {}", resourcePath);
        } catch (IOException | UnsatisfiedLinkError e) {
            log.warn("Failed to load native library", e);
        }
    }

    @SuppressWarnings("java:S5443")
    static Path createSecureTempDir() throws IOException {
        try {
            FileAttribute<Set<PosixFilePermission>> attr = PosixFilePermissions.asFileAttribute(
                    PosixFilePermissions.fromString("rwx------"));
            return Files.createTempDirectory("homelibrary_", attr);
        } catch (UnsupportedOperationException e) {
            return Files.createTempDirectory("homelibrary_");
        }
    }
}
