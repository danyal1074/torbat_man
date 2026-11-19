import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Each test file builds its own in-memory PostgreSQL (PGlite) instance.
    pool: 'forks',
  },
});
