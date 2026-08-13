import { describe, expect, it, vi } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'
import { registerSocketHandlers } from './socket.js'

// A pure unit test against a minimal fake socket object — no real network,
// no real server. Mirrors the fake-socket pattern the plan's `<behavior>`
// spec calls for: `fakeSocket.on(event, cb)` just records `cb` under
// `event`, letting each test invoke the handler directly.
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
  it('invalidates the recipes cache once on inventory:changed', () => {
    const socket = createFakeSocket()
    const queryClient = createFakeQueryClient()

    registerSocketHandlers(socket, queryClient)
    socket.trigger('inventory:changed')

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1)
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['recipes'] })
  })

  it('invalidates both the specific recipe and the recipes list on recipe:updated', () => {
    const socket = createFakeSocket()
    const queryClient = createFakeQueryClient()

    registerSocketHandlers(socket, queryClient)
    socket.trigger('recipe:updated', { recipeId: 'abc' })

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2)
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['recipes', 'abc'] })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['recipes'] })
  })

  it('re-invalidates recipes and tags on connect (initial connection AND every reconnect)', () => {
    const socket = createFakeSocket()
    const queryClient = createFakeQueryClient()

    registerSocketHandlers(socket, queryClient)
    socket.trigger('connect')

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2)
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['recipes'] })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tags'] })
  })
})
