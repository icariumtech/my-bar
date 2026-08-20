import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Real-listening-server Socket.IO tests (hub.test.ts, orders.test.ts) bind
    // an actual TCP port and connect a real client in beforeEach — the default
    // 10s hook timeout is tight enough to flake on slower/shared CI runners
    // (GitHub Actions) even though it's comfortable on local dev machines.
    hookTimeout: 20000,
  },
})
