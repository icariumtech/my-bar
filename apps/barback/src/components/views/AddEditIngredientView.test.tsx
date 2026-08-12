import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Ingredient } from '@my-bar/shared'
import { AddEditIngredientView } from './AddEditIngredientView.js'

const FIXTURE_CATEGORY = { id: '11111111-1111-1111-1111-111111111111', name: 'Rum' }

const FIXTURE_INGREDIENT_RESPONSE: Ingredient = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Bacardi Superior',
  categoryId: FIXTURE_CATEGORY.id,
  categoryName: FIXTURE_CATEGORY.name,
  note: null,
  inStock: true,
}

function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/categories' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [FIXTURE_CATEGORY],
      } as Response)
    }
    if (url === '/api/ingredients' && method === 'POST') {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => FIXTURE_INGREDIENT_RESPONSE,
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderView(props: { ingredient?: Ingredient; onBack: () => void }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AddEditIngredientView {...props} />
    </QueryClientProvider>,
  )
}

describe('AddEditIngredientView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders no role="dialog" element and does render a "← Back" button (D-26: not Modal-wrapped)', () => {
    stubFetch()
    renderView({ onBack: vi.fn() })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument()
  })

  it('clicking "← Back" without submitting calls onBack and does not call either mutation', () => {
    const fetchMock = stubFetch()
    const onBack = vi.fn()
    renderView({ onBack })

    fireEvent.click(screen.getByRole('button', { name: /Back/ }))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
      ),
    ).toBe(false)
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      ),
    ).toBe(false)
  })

  it("submitting a valid new ingredient calls useCreateIngredient's mutation and then onBack", async () => {
    const fetchMock = stubFetch()
    const onBack = vi.fn()
    renderView({ onBack })

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Bacardi Superior' },
    })

    // Type a partial (not exact) match — the AutoComplete input's own
    // display wrapper carries a `title` attribute mirroring whatever raw
    // text is typed, so typing the category's exact full name would make
    // that wrapper's title collide with the real dropdown option's title
    // once categories finish loading, making `findByTitle` ambiguous.
    // `findByTitle` polls, so this also naturally waits out
    // CategoryPicker's own useCategories() fetch before a match is found.
    const combobox = screen.getByRole('combobox')
    fireEvent.change(combobox, { target: { value: 'Ru' } })
    fireEvent.click(await screen.findByTitle('Rum'))

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === '/api/ingredients' && (init as RequestInit | undefined)?.method === 'POST',
        ),
      ).toBe(true)
    })
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1))
  })
})
