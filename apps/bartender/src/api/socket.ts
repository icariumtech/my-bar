import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'

// A minimal structural type (just `.on`) — mirrors
// apps/patron/src/api/socket.ts's own SocketLike pattern.
interface SocketLike {
  on(event: string, listener: (...args: unknown[]) => void): unknown
}

// SYNC-01/Pitfall 4: pure wiring — every handler re-fetches via the
// existing REST endpoint (TanStack Query invalidation), never trusts a WS
// payload as the data itself. `orders:updated` has no emitter yet (that
// lands in Plan 04-03) — registering the handler now is free and avoids a
// second socket.ts edit later. `connect` fires on the initial connection
// AND on every successful reconnection, closing the "missed broadcast
// while disconnected" gap for a Bartender device that sleeps or roams
// WiFi (Pitfall 4/5).
export function registerSocketHandlers(socket: SocketLike, queryClient: QueryClient): void {
  socket.on('orders:created', () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })

  socket.on('orders:updated', () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })

  socket.on('connect', () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })
}

// Connects as soon as the app boots (called from main.tsx before render).
// `io()` with no explicit URL resolves same-origin in production and
// through the Vite dev proxy (vite.config.ts) in development.
// `reconnection` is left at its default `true`.
export function initSocket(queryClient: QueryClient): Socket {
  const socket = io()
  registerSocketHandlers(socket, queryClient)
  return socket
}
