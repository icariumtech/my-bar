import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Category, Ingredient } from '@my-bar/shared'
import { IngredientsTab } from './IngredientsTab.js'

// 260812-e8j regression guard: proves the state lift (query/categoryId
// moved from IngredientList up to IngredientsTab so the title/Add-button
// row and SearchFilterBar can render together inside one sticky wrapper)
// didn't break the wiring between the tab-rendered SearchFilterBar and the
// now-props-driven IngredientList filter.

const FIXTURE_CATEGORIES: Category[] = [
  { id: 'cccccccc-1111-1111-1111-111111111111', name: 'Rum' },
  { id: 'cccccccc-2222-2222-2222-222222222222', name: 'Gin' },
]

const FIXTURE_INGREDIENTS: Ingredient[] = [
  {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    name: 'Havana Club',
    categoryId: 'cccccccc-1111-1111-1111-111111111111',
    categoryName: 'Rum',
    note: null,
    inStock: true,
  },
  {
    id: 'aaaaaaaa-2222-2222-2222-222222222222',
    name: 'Bombay Sapphire',
    categoryId: 'cccccccc-2222-2222-2222-222222222222',
    categoryName: 'Gin',
    note: null,
    inStock: true,
  },
]

function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/ingredients' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => FIXTURE_INGREDIENTS,
      } as Response)
    }

    if (url === '/api/categories' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => FIXTURE_CATEGORIES,
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <IngredientsTab />
    </QueryClientProvider>,
  )
}

describe('IngredientsTab', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders all ingredients before any search/filter is applied', async () => {
    stubFetch()
    renderTab()

    expect(await screen.findByText('Havana Club')).toBeInTheDocument()
    expect(await screen.findByText('Bombay Sapphire')).toBeInTheDocument()
  })

  it('typing a query into the lifted SearchFilterBar filters IngredientList by name', async () => {
    stubFetch()
    renderTab()

    await screen.findByText('Havana Club')

    fireEvent.change(screen.getByPlaceholderText('Search by name or category'), {
      target: { value: 'Havana' },
    })

    expect(await screen.findByText('Havana Club')).toBeInTheDocument()
    expect(screen.queryByText('Bombay Sapphire')).not.toBeInTheDocument()
  })

  it('clicking a category chip in the lifted SearchFilterBar filters IngredientList by category', async () => {
    stubFetch()
    renderTab()

    await screen.findByText('Havana Club')

    fireEvent.click(await screen.findByRole('tab', { name: 'Gin' }))

    expect(await screen.findByText('Bombay Sapphire')).toBeInTheDocument()
    expect(screen.queryByText('Havana Club')).not.toBeInTheDocument()
  })
})
