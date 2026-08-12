import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { CategoryManager } from './CategoryManager.js'

// D-24/D-26: CategoryManager is now a full-screen view (no Modal wrapper),
// reached from SettingsTab's "Categories" menu item — these tests assert
// the shell conversion (back button wired to onBack, no role="dialog")
// while leaving Phase 1's add/rename/delete behavior untouched.
function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url === '/api/categories' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [{ id: 'cat-1', name: 'Rum' }],
      } as Response)
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderCategoryManager(onBack = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CategoryManager onBack={onBack} />
    </QueryClientProvider>,
  )
  return { onBack }
}

describe('CategoryManager', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders no role="dialog" element (Modal wrapper is gone)', () => {
    stubFetch()
    renderCategoryManager()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders a "Back" button that calls onBack when clicked', () => {
    stubFetch()
    const { onBack } = renderCategoryManager()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('still renders existing categories and the add-category affordance', async () => {
    stubFetch()
    renderCategoryManager()

    expect(await screen.findByText('Rum')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('New category name')).toBeInTheDocument()
    expect(screen.getByText('Add Category')).toBeInTheDocument()
  })
})
