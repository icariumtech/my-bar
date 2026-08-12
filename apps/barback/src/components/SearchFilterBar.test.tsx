import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SearchFilterBar } from './SearchFilterBar.js'

// 260812-jz9: covers the new inline square "+" add button (onAdd/addLabel
// props) added beside the search Input, replacing the full-width "Add
// {Item}" button row that previously lived above this component in
// IngredientsTab.

function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/categories' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderBar(onAdd = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SearchFilterBar
        query=""
        onQueryChange={vi.fn()}
        categoryId={null}
        onCategoryChange={vi.fn()}
        onAdd={onAdd}
        addLabel="Add Ingredient"
      />
    </QueryClientProvider>,
  )
}

describe('SearchFilterBar', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a square add button next to the search input', async () => {
    stubFetch()
    renderBar()

    const addButton = await screen.findByRole('button', { name: 'Add Ingredient' })
    expect(addButton).toBeInTheDocument()
    expect(addButton).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('clicking the add button calls onAdd', async () => {
    stubFetch()
    const onAdd = vi.fn()
    renderBar(onAdd)

    const addButton = await screen.findByRole('button', { name: 'Add Ingredient' })
    fireEvent.click(addButton)

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(screen.getByPlaceholderText('Search by name or category')).toBeInTheDocument()
  })
})
