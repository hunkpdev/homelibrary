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
        try {
            if (tempDir == null) {
                tempDir = createSecureTempDir();
                tempDir.toFile().deleteOnExit();
            }
            loadTo(resourcePath, tempDir);
        } catch (IOException e) {
            log.warn("Failed to create temp directory for native library", e);
        }
    }

    /**
     * Extracts a native library to a specific directory and loads it.
     * Use this when the target directory matters for dependency resolution —
     * e.g. when a third-party loader will extract a dependent library to the same directory
     * and RPATH=$ORIGIN must resolve against it.
     */
    public void loadTo(String resourcePath, Path targetDirectory) {
        try (InputStream is = classLoader.getResourceAsStream(resourcePath)) {
            if (is == null) {
                log.warn("Native library not found in classpath at {}", resourcePath);
                return;
            }
            String filename = Paths.get(resourcePath).getFileName().toString();
            Path targetFile = targetDirectory.resolve(filename);
            targetFile.toFile().deleteOnExit();
            Files.copy(is, targetFile, StandardCopyOption.REPLACE_EXISTING);
            systemLoader.load(targetFile.toAbsolutePath().toString());
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
