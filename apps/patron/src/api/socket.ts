import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'

// A minimal structural type (just `.on`) rather than `Pick<Socket, 'on'>`
// — the real Socket.IO client's `.on` is a heavily overloaded generic tied
// to its reserved-event map, which a plain fake object can never
// structurally satisfy. This narrower shape is what registerSocketHandlers
// actually needs, and is trivially testable with a fake object in
// socket.test.ts, no real socket.io-client instance needed.
interface SocketLike {
  on(event: string, listener: (...args: unknown[]) => void): unknown
}

// SYNC-01: pure wiring — every handler here re-fetches via the existing
// REST endpoints (TanStack Query invalidation), never trusts a WS payload
// as the data itself. `connect` fires on the initial connection AND on
// every successful reconnection (Socket.IO's own behavior), which is
// exactly what closes the "missed broadcast while disconnected" gap for a
// kiosk iPad that sleeps or roams WiFi — no separate `reconnect`-specific
// handler is needed.
export function registerSocketHandlers(socket: SocketLike, queryClient: QueryClient): void {
  socket.on('inventory:changed', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  socket.on('recipe:updated', (...args: unknown[]) => {
    const { recipeId } = args[0] as { recipeId: string }
    // recipe's own detail view AND the browse grid/tag rail (a tag
    // reassignment may have changed tag counts, not just this one recipe).
    queryClient.invalidateQueries({ queryKey: ['recipes', recipeId] })
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  socket.on('connect', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
    queryClient.invalidateQueries({ queryKey: ['tags'] })
  })
}

// SYNC-01/D-46/D-47: connects as soon as the app boots (called from
// main.tsx before render), independent of which view is mounted, so cache
// invalidation works identically whether the browse grid or a detail view
// happens to be open. `io()` with no explicit URL resolves same-origin in
// production and through the Vite dev proxy (vite.config.ts) in
// development. `reconnection` is left at its default `true` — never
// disabled — per this plan's own prohibition against silently freezing
// the Patron UI at a stale makeable status on connection failure.
export function initSocket(queryClient: QueryClient): Socket {
  const socket = io()
  registerSocketHandlers(socket, queryClient)
  return socket
}
