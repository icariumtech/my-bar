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
