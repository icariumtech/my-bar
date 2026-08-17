import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DeleteIngredientError, useDeleteIngredient, useToggleStock, useUpdateIngredient } from './useIngredients.js'

// G-02-9 regression guard: useToggleStock's onSettled invalidated only
// ['ingredients'], never ['recipes'] — so the recipes list/detail's
// makeable badge stayed stale after a swipe-toggle stock change until a
// manual page reload. useUpdateIngredient had the same latent gap. Both
// should mirror useUpdateGlassware/useRenameCategory's established
// cross-entity-invalidation pattern (see .planning/debug/stale-makeable-badge.md).

function stubFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'i1',
        name: 'Rye',
        categoryId: 'c1',
        categoryName: 'Whiskey',
        note: null,
        inStock: false,
      }),
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

function invalidatedQueryKeys(invalidateSpy: ReturnType<typeof vi.spyOn>) {
  return invalidateSpy.mock.calls.map(
    (call: unknown[]) => (call[0] as { queryKey: unknown[] } | undefined)?.queryKey,
  )
}

describe('useIngredients cross-entity invalidation (G-02-9)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("useToggleStock invalidates both ['ingredients'] and ['recipes'] on settle", async () => {
    stubFetchOk()
    const { result, invalidateSpy } = renderWithClient(() => useToggleStock())

    result.current.mutate({ id: 'i1', inStock: false })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = invalidatedQueryKeys(invalidateSpy)
    expect(keys).toContainEqual(['ingredients'])
    expect(keys).toContainEqual(['recipes'])
  })

  it("useUpdateIngredient invalidates ['ingredients'], ['categories'], AND ['recipes'] on settle", async () => {
    stubFetchOk()
    const { result, invalidateSpy } = renderWithClient(() => useUpdateIngredient())

    result.current.mutate({ id: 'i1', patch: { name: 'Rye Whiskey' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = invalidatedQueryKeys(invalidateSpy)
    expect(keys).toContainEqual(['ingredients'])
    expect(keys).toContainEqual(['categories'])
    expect(keys).toContainEqual(['recipes'])
  })

  it("useDeleteIngredient invalidates both ['ingredients'] and ['recipes'] on settle (success)", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 204 }))
    const { result, invalidateSpy } = renderWithClient(() => useDeleteIngredient())

    result.current.mutate('i1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = invalidatedQueryKeys(invalidateSpy)
    expect(keys).toContainEqual(['ingredients'])
    expect(keys).toContainEqual(['recipes'])
  })

  it('useDeleteIngredient throws a DeleteIngredientError carrying the server message on non-204, and still invalidates on settle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ error: 'Ingredient not found' }),
      }),
    )
    const { result, invalidateSpy } = renderWithClient(() => useDeleteIngredient())

    result.current.mutate('i1')

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DeleteIngredientError)
    expect(result.current.error?.message).toBe('Ingredient not found')

    const keys = invalidatedQueryKeys(invalidateSpy)
    expect(keys).toContainEqual(['ingredients'])
    expect(keys).toContainEqual(['recipes'])
  })
})
