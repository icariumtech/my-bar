import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Proxies /api to the Fastify server so dev and production share one
// relative fetch path (src/api/client.ts hits '/api/...' either way).
// base: production assets are served by Fastify under the /patron/ prefix
// (apps/server/src/index.ts @fastify/static registration), so built asset
// URLs must be rooted there; dev keeps the default root base. No
// /socket.io proxy entry yet — that lands in plan 03-05 alongside the code
// that actually needs it.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? '/patron/' : '/',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}))
