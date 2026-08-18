import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Proxies /api to the Fastify server so dev and production share one
// relative fetch path (src/api/client.ts hits '/api/...' either way).
// base: production assets are served by Fastify under the /bartender/
// prefix (apps/server/src/index.ts @fastify/static registration), so
// built asset URLs must be rooted there; dev keeps the default root base.
// The '/api' entry (a plain string target) only forwards HTTP requests —
// Socket.IO's handshake needs the WebSocket upgrade explicitly proxied via
// the object form with `ws: true` (Bartender needs live Socket.IO like
// Patron, unlike Barback which has none), or the dev-mode client can never
// establish a connection even though production (same-origin, no proxy
// involved) works fine.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? '/bartender/' : '/',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
}))
