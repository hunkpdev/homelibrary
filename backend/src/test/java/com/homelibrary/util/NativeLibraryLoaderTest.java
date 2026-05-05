package com.homelibrary.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NativeLibraryLoaderTest {

    @Test
    void load_libraryFoundInClasspath_extractsAndCallsSystemLoad() {
        ClassLoader mockClassLoader = mock(ClassLoader.class);
        when(mockClassLoader.getResourceAsStream(anyString()))
                .thenReturn(new ByteArrayInputStream(new byte[]{1, 2, 3}));
        List<String> loadedPaths = new ArrayList<>();
        NativeLibraryLoader loader = new NativeLibraryLoader(mockClassLoader, loadedPaths::add);

        loader.load("native/test/libtest.so", ".so");

        assertThat(loadedPaths).hasSize(1);
        assertThat(loadedPaths.get(0)).endsWith(".so");
    }

    @Test
    void load_libraryNotFoundInClasspath_doesNotThrow() {
        ClassLoader mockClassLoader = mock(ClassLoader.class);
        when(mockClassLoader.getResourceAsStream(anyString())).thenReturn(null);
        NativeLibraryLoader loader = new NativeLibraryLoader(mockClassLoader, path -> {});

        assertThatCode(() -> loader.load("native/missing.so", ".so"))
                .doesNotThrowAnyException();
    }

    @Test
    void load_unsatisfiedLinkError_doesNotPropagate() {
        ClassLoader mockClassLoader = mock(ClassLoader.class);
        when(mockClassLoader.getResourceAsStream(anyString()))
                .thenReturn(new ByteArrayInputStream(new byte[]{1}));
        NativeLibraryLoader loader = new NativeLibraryLoader(
                mockClassLoader,
                path -> { throw new UnsatisfiedLinkError("test link error"); }
        );

        assertThatCode(() -> loader.load("native/test.so", ".so"))
                .doesNotThrowAnyException();
    }

    @Test
    void createSecureTempDir_returnsWritableTempDirectory() throws IOException {
        Path dir = NativeLibraryLoader.createSecureTempDir();

        assertThat(dir).isDirectory();
        assertThat(dir.toFile()).canWrite();
        Files.delete(dir);
    }

    @Test
    @EnabledOnOs(OS.LINUX)
    void createSecureTempDir_onPosix_setsOwnerOnlyPermissions() throws IOException {
        Path dir = NativeLibraryLoader.createSecureTempDir();

        Set<PosixFilePermission> perms = Files.getPosixFilePermissions(dir);
        assertThat(perms).containsExactlyInAnyOrder(
                PosixFilePermission.OWNER_READ,
                PosixFilePermission.OWNER_WRITE,
                PosixFilePermission.OWNER_EXECUTE
        );
        Files.delete(dir);
    }
}
