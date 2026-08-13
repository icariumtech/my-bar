import type { FastifyInstance } from 'fastify'
import { Server as SocketIOServer } from 'socket.io'

// Module augmentation: makes `app.io` a recognized, optional, typed
// property everywhere a FastifyInstance is in scope, without every route
// file needing its own local augmentation. Optional because route test
// suites (ingredients.test.ts, recipes.test.ts) build a bare Fastify()
// instance with no hub registered — `app.io` is `undefined` there, and
// every emit call site uses `app.io?.emit(...)` to stay a no-op in that
// case rather than throwing.
declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer
  }
}

// Attaches Socket.IO to the Fastify HTTP server and decorates `app.io` so
// route handlers can broadcast change events. No explicit `cors` option —
// the browser only ever reaches this through same-origin production
// serving or the Vite dev proxy (apps/patron/vite.config.ts), so no
// cross-origin grant is needed; this matches the project's existing
// minimal-CORS posture for the REST API (T-01-03).
export function registerSocketHub(app: FastifyInstance): SocketIOServer {
  const io = new SocketIOServer(app.server)
  app.decorate('io', io)
  return io
}
