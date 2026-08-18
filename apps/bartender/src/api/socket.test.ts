import { describe, expect, it, vi } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'
import { registerSocketHandlers } from './socket.js'

// A pure unit test against a minimal fake socket object — identical
// fake-socket pattern to apps/patron/src/api/socket.test.ts.
function createFakeSocket() {
  const handlers = new Map<string, (...args: unknown[]) => void>()
  return {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb)
    }),
    trigger(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args)
    },
  }
}

function createFakeQueryClient() {
  return { invalidateQueries: vi.fn() } as unknown as QueryClient
}

describe('registerSocketHandlers', () => {
  it('invalidates ["orders"] on orders:created', () => {
    const socket = createFakeSocket()
    const queryClient = createFakeQueryClient()

    registerSocketHandlers(socket, queryClient)
    socket.trigger('orders:created')

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })

  it('invalidates ["orders"] on orders:updated', () => {
    const socket = createFakeSocket()
    const queryClient = createFakeQueryClient()

    registerSocketHandlers(socket, queryClient)
    socket.trigger('orders:updated')

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })

  it('invalidates ["orders"] on connect', () => {
    const socket = createFakeSocket()
    const queryClient = createFakeQueryClient()

    registerSocketHandlers(socket, queryClient)
    socket.trigger('connect')

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })
})
