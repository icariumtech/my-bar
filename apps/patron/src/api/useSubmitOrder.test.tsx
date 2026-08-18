import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiFetch } from './client.js'
import { useSubmitOrder } from './useSubmitOrder.js'

vi.mock('./client.js', () => ({
  apiFetch: vi.fn(),
}))

const mockedApiFetch = vi.mocked(apiFetch)

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useSubmitOrder', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset()
  })

  it('POSTs to /orders with the exact JSON body', async () => {
    mockedApiFetch.mockResolvedValue({ id: 'order-1' })
    const { result } = renderHook(() => useSubmitOrder(), { wrapper })

    result.current.mutate({ recipeId: 'recipe-1', patronName: 'Alice' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedApiFetch).toHaveBeenCalledWith('/orders', {
      method: 'POST',
      body: JSON.stringify({ recipeId: 'recipe-1', patronName: 'Alice' }),
    })
  })

  it('surfaces a rejected apiFetch call as the mutation error', async () => {
    mockedApiFetch.mockRejectedValue(new Error('Recipe is not currently makeable'))
    const { result } = renderHook(() => useSubmitOrder(), { wrapper })

    result.current.mutate({ recipeId: 'recipe-1' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('Recipe is not currently makeable')
  })
})
