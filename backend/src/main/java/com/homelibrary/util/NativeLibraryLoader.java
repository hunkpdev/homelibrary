package com.homelibrary.util;

import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    private Path tempDir;

    public NativeLibraryLoader(ClassLoader classLoader, SystemLoader systemLoader) {
        this.classLoader = classLoader;
        this.systemLoader = systemLoader;
    }

    /**
     * Extracts a native library from the classpath and loads it via System.load().
     * All libraries loaded by the same instance share one temp directory, preserving
     * their original filenames. This is required so that a library compiled with
     * RPATH=$ORIGIN (e.g. libyaz4j.so depending on libyaz.so.5) can resolve its
     * dependencies at load time — the dynamic linker finds them in the same directory.
     */
    public void load(String resourcePath) {
        try (InputStream is = classLoader.getResourceAsStream(resourcePath)) {
            if (is == null) {
                log.warn("Native library not found in classpath at {}", resourcePath);
                return;
            }
            if (tempDir == null) {
                tempDir = createSecureTempDir();
                tempDir.toFile().deleteOnExit();
            }
            String filename = Paths.get(resourcePath).getFileName().toString();
            Path tempFile = tempDir.resolve(filename);
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
