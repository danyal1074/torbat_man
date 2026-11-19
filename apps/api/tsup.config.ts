import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/db/migrate-cli.ts', 'src/seed/seed-cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript sources, so they are bundled in.
  noExternal: [/^@torbat\//],
});
