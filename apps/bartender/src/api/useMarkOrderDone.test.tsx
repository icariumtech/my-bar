import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMarkOrderDone } from './useMarkOrderDone.js'

function stubFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'o1', status: 'done' }),
    }),
  )
}

function renderWithClient<T>(callback: () => T) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(callback, { wrapper })
  return { result, invalidateSpy }
}

describe('useMarkOrderDone', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Regression test for bartender-done-list-not-clearing: onSettled's
  // invalidateQueries alone means the ['orders'] cache (read by both
  // OrdersTab's list and App.tsx's badge count) only reflects a completed
  // Done tap after a FULL network round trip resolves. On a slow/high-
  // latency connection (this app's real target: Raspberry Pi over home
  // WiFi) that round trip can take seconds, during which the list/badge
  // incorrectly still show the order as open. An onMutate optimistic
  // update must flip the order's status in the cache synchronously with
  // the mutate() call, independent of how long the network takes.
  it('optimistically marks the target order done in the [\'orders\'] cache immediately on mutate(), before the network request resolves', async () => {
    let resolveFetch!: (value: unknown) => void
    const pendingFetch = new Promise((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingFetch))

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders'], [
      { id: 'o1', status: 'new' },
      { id: 'o2', status: 'new' },
    ])
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useMarkOrderDone(), { wrapper })

    result.current.mutate('o1')

    // The cache must already reflect 'done' for o1 while the network call
    // is still in flight (fetch's promise deliberately never resolved yet).
    await waitFor(
      () => {
        const cached = queryClient.getQueryData<{ id: string; status: string }[]>(['orders'])
        expect(cached?.find((o) => o.id === 'o1')?.status).toBe('done')
      },
      { timeout: 300 },
    )
    // The order NOT being mutated must stay untouched by the optimistic update.
    expect(
      queryClient.getQueryData<{ id: string; status: string }[]>(['orders'])?.find((o) => o.id === 'o2')?.status,
    ).toBe('new')
    // Confirms the assertion above is about the OPTIMISTIC update, not a
    // real response that already landed.
    expect(result.current.isSuccess).toBe(false)

    resolveFetch({ ok: true, status: 200, json: async () => ({ id: 'o1', status: 'done' }) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('issues a PATCH to /orders/:id/done', async () => {
    stubFetchOk()
    const { result } = renderWithClient(() => useMarkOrderDone())

    result.current.mutate('o1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetch).toHaveBeenCalledWith(
      '/api/orders/o1/done',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it("invalidates ['orders'] onSettled", async () => {
    stubFetchOk()
    const { result, invalidateSpy } = renderWithClient(() => useMarkOrderDone())

    result.current.mutate('o1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })
})
