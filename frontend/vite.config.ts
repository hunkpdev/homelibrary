import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    reporters: ['default', 'html', 'junit'],
    outputFile: {
      html: './test-results/index.html',
      junit: './test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/components/ui/**',
        'src/lib/**',
        'src/api/model/**',
        'src/api/types.ts',
        'src/main.tsx',
        'src/App.tsx',
        'src/vite-env.d.ts',
        'src/i18n/**',
        'src/test/**',
        'src/components/layout/**',
        'src/components/grid/**',
        'src/hooks/useTheme.ts',
        'src/pages/ForbiddenPage.tsx',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
    },
  },
})
