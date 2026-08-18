import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useOpenOrder } from './useOpenOrder.js'

function stubFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'o1', status: 'in_progress' }),
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

describe('useOpenOrder', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('issues a PATCH to /orders/:id/start', async () => {
    stubFetchOk()
    const { result } = renderWithClient(() => useOpenOrder())

    result.current.mutate('o1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetch).toHaveBeenCalledWith(
      '/api/orders/o1/start',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it("invalidates ['orders'] onSettled on success", async () => {
    stubFetchOk()
    const { result, invalidateSpy } = renderWithClient(() => useOpenOrder())

    result.current.mutate('o1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })

  it("invalidates ['orders'] onSettled on failure too", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Order not found' }),
      }),
    )
    const { result, invalidateSpy } = renderWithClient(() => useOpenOrder())

    result.current.mutate('o1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })
})
