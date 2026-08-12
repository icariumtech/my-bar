import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Category, Ingredient } from '@my-bar/shared'
import { IngredientPicker } from './IngredientPicker.js'
import type { IngredientPickerValue } from './IngredientPicker.js'

// D-28/D-30/D-29: exercises the combined category-or-specific-ingredient
// search, the specific-lock checkbox, and the inline-create trigger's task-1
// stub callback. Follows RecipeForm.test.tsx's antd Select interaction
// pattern (mousedown to open, click the rendered option by title) since
// AutoComplete renders through the same underlying combobox.

const fixtureCategory: Category = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Rum',
}

const fixtureIngredient: Ingredient = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Havana Club',
  categoryId: fixtureCategory.id,
  categoryName: fixtureCategory.name,
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
        json: async () => [fixtureCategory],
      } as Response)
    }

    if (url === '/api/ingredients' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [fixtureIngredient],
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPicker(value: IngredientPickerValue, onChange = vi.fn(), onRequestCreate = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    onChange,
    onRequestCreate,
    ...render(
      <QueryClientProvider client={queryClient}>
        <IngredientPicker value={value} onChange={onChange} onRequestCreate={onRequestCreate} />
      </QueryClientProvider>,
    ),
  }
}

function openPicker() {
  const combobox = screen.getByRole('combobox')
  fireEvent.mouseDown(combobox)
  return combobox
}

describe('IngredientPicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selecting a category option sets ingredientId null / requiresSpecific false and renders no checkbox', async () => {
    const fetchMock = stubFetch()
    const { onChange } = renderPicker({
      categoryId: undefined,
      ingredientId: null,
      requiresSpecific: false,
    })

    await screen.findByRole('combobox')
    openPicker()
    fireEvent.click(await screen.findByTitle('Rum'))

    expect(onChange).toHaveBeenCalledWith({
      categoryId: fixtureCategory.id,
      ingredientId: null,
      requiresSpecific: false,
    })
    expect(screen.queryByText('Must be this specific ingredient')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/categories')).toBe(true)
  })

  it('selecting an ingredient option sets ingredientId, requiresSpecific true, and renders the checked checkbox', async () => {
    stubFetch()
    const { onChange, rerender } = renderPicker({
      categoryId: undefined,
      ingredientId: null,
      requiresSpecific: false,
    })

    await screen.findByRole('combobox')
    openPicker()
    fireEvent.click(await screen.findByTitle('Havana Club (Rum)'))

    expect(onChange).toHaveBeenCalledWith({
      categoryId: fixtureCategory.id,
      ingredientId: fixtureIngredient.id,
      requiresSpecific: true,
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    rerender(
      <QueryClientProvider client={queryClient}>
        <IngredientPicker
          value={{
            categoryId: fixtureCategory.id,
            ingredientId: fixtureIngredient.id,
            requiresSpecific: true,
          }}
          onChange={vi.fn()}
        />
      </QueryClientProvider>,
    )

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Must be this specific ingredient',
    })
    expect(checkbox).toBeChecked()
  })

  it('unchecking the checkbox calls onChange with requiresSpecific false while ingredientId is unchanged', async () => {
    stubFetch()
    const onChange = vi.fn()
    renderPicker(
      {
        categoryId: fixtureCategory.id,
        ingredientId: fixtureIngredient.id,
        requiresSpecific: true,
      },
      onChange,
    )

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Must be this specific ingredient',
    })
    fireEvent.click(checkbox)

    expect(onChange).toHaveBeenCalledWith({
      categoryId: fixtureCategory.id,
      ingredientId: fixtureIngredient.id,
      requiresSpecific: false,
    })
  })

  it('a line with no specific ingredient selected never shows the checkbox', async () => {
    stubFetch()
    renderPicker({
      categoryId: fixtureCategory.id,
      ingredientId: null,
      requiresSpecific: false,
    })

    await screen.findByRole('combobox')
    expect(screen.queryByText('Must be this specific ingredient')).not.toBeInTheDocument()
  })

  it('category options are labeled distinctly from ingredient options', async () => {
    stubFetch()
    renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

    await screen.findByRole('combobox')
    openPicker()

    expect(await screen.findByTitle('Rum')).toBeInTheDocument()
    expect(await screen.findByTitle('Havana Club (Rum)')).toBeInTheDocument()
  })

  it('typing a name matching no existing ingredient shows "+ Add new ingredient" and calls onRequestCreate on select', async () => {
    stubFetch()
    const { onRequestCreate } = renderPicker({
      categoryId: undefined,
      ingredientId: null,
      requiresSpecific: false,
    })

    const combobox = await screen.findByRole('combobox')
    openPicker()
    await userEvent.type(combobox, 'Lemon Juice')

    fireEvent.click(await screen.findByTitle('+ Add new ingredient "Lemon Juice"'))

    expect(onRequestCreate).toHaveBeenCalledWith('Lemon Juice')
  })

  it('typing a name that exactly matches an existing ingredient (any case) does not offer "+ Add new ingredient"', async () => {
    stubFetch()
    renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

    const combobox = await screen.findByRole('combobox')
    openPicker()
    await userEvent.type(combobox, 'havana club')

    await screen.findByTitle('Havana Club (Rum)')
    expect(screen.queryByText(/\+ Add new ingredient/)).not.toBeInTheDocument()
  })
})
