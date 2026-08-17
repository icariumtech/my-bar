import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Category, Ingredient } from '@my-bar/shared'
import { IngredientPicker } from './IngredientPicker.js'
import type { IngredientPickerValue } from './IngredientPicker.js'

// D-28/D-30/D-29: exercises the combined category-or-specific-ingredient
// search, the specific-lock checkbox, and the inline ingredient-creation
// sub-flow. Follows RecipeForm.test.tsx's antd Select interaction pattern
// (mousedown to open, click the rendered option by title) since AutoComplete
// renders through the same underlying combobox; typing uses userEvent.type
// (fireEvent.change does not propagate through rc-select's combobox input).

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

const createdIngredientId = '33333333-3333-3333-3333-333333333333'
const createdCategoryId = '44444444-4444-4444-4444-444444444444'

interface StubOptions {
  onCreateIngredient?: (body: { name: string; categoryId: string }) => void
  onToggleStock?: (id: string, inStock: boolean) => void
  onCreateCategory?: (body: { name: string }) => void
  createCategoryStatus?: number
}

function stubFetch(options: StubOptions = {}) {
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

    if (url === '/api/ingredients' && method === 'POST') {
      const body = JSON.parse(init!.body as string) as { name: string; categoryId: string }
      options.onCreateIngredient?.(body)
      const created: Ingredient = {
        id: createdIngredientId,
        name: body.name,
        categoryId: body.categoryId,
        categoryName: fixtureCategory.name,
        note: null,
        inStock: true,
      }
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => created,
      } as Response)
    }

    if (url === '/api/categories' && method === 'POST') {
      const body = JSON.parse(init!.body as string) as { name: string }
      options.onCreateCategory?.(body)
      if (options.createCategoryStatus && options.createCategoryStatus >= 400) {
        return Promise.resolve({
          ok: false,
          status: options.createCategoryStatus,
          json: async () => ({ error: 'boom' }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => ({ id: createdCategoryId, name: body.name }),
      } as Response)
    }

    if (url === `/api/ingredients/${createdIngredientId}/stock` && method === 'PATCH') {
      const body = JSON.parse(init!.body as string) as { inStock: boolean }
      options.onToggleStock?.(createdIngredientId, body.inStock)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          id: createdIngredientId,
          name: 'whatever',
          categoryId: fixtureCategory.id,
          categoryName: fixtureCategory.name,
          note: null,
          inStock: body.inStock,
        }),
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPicker(value: IngredientPickerValue, onChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    onChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <IngredientPicker value={value} onChange={onChange} />
      </QueryClientProvider>,
    ),
  }
}

function openPicker() {
  const combobox = screen.getByRole('combobox')
  fireEvent.mouseDown(combobox)
  return combobox
}

// The outer IngredientPicker's own AutoComplete dropdown is rc-motion
// "leaving" (not unmounted) after a selection closes it — jsdom never fires
// the animation-end event that would remove it, so its (stale) option nodes
// remain queryable alongside the freshly-opened CategoryPicker dropdown
// inside the creating sub-form. Both can carry the same title (e.g. "Rum").
// The freshest portal is appended last in DOM order, so select the last
// match rather than assuming uniqueness.
async function clickFreshestTitle(title: string) {
  const matches = await screen.findAllByTitle(title)
  fireEvent.click(matches[matches.length - 1])
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

  it('typing a name that exactly matches an existing ingredient (any case) does not offer "+ Add new ingredient"', async () => {
    stubFetch()
    renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

    const combobox = await screen.findByRole('combobox')
    openPicker()
    await userEvent.type(combobox, 'havana club')

    await screen.findByTitle('Havana Club (Rum)')
    expect(screen.queryByText(/\+ Add new ingredient/)).not.toBeInTheDocument()
  })

  it('typing search text that matches neither the fixture category nor ingredient hides both from the dropdown', async () => {
    stubFetch()
    renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

    const combobox = await screen.findByRole('combobox')
    openPicker()
    await userEvent.type(combobox, 'zzz-no-match')

    expect(screen.queryByTitle('Rum')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Havana Club (Rum)')).not.toBeInTheDocument()
    expect(await screen.findByTitle('+ Add new ingredient "zzz-no-match"')).toBeInTheDocument()
  })

  it('typing text that matches only the ingredient name hides the non-matching category option', async () => {
    stubFetch()
    renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

    const combobox = await screen.findByRole('combobox')
    openPicker()
    await userEvent.type(combobox, 'Havana')

    expect(screen.queryByTitle('Rum')).not.toBeInTheDocument()
    expect(await screen.findByTitle('Havana Club (Rum)')).toBeInTheDocument()
  })

  describe('inline ingredient creation (D-29)', () => {
    it('selecting "+ Add new ingredient" reveals an inline sub-form with an empty required category field, no Modal', async () => {
      stubFetch()
      renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Lemon Juice')
      fireEvent.click(await screen.findByTitle('+ Add new ingredient "Lemon Juice"'))

      // The main input also echoes "Lemon Juice" as its typed text — scope
      // this to the sub-form's own "New ingredient: <name>" label.
      expect(screen.getByText('Lemon Juice', { selector: 'strong' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
    })

    it('"Create" is disabled until a category is chosen', async () => {
      stubFetch()
      renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Lemon Juice')
      fireEvent.click(await screen.findByTitle('+ Add new ingredient "Lemon Juice"'))

      const createButton = screen.getByRole('button', { name: 'Create' })
      expect(createButton).toBeDisabled()

      // Choose a category via the nested CategoryPicker's own combobox (the
      // second combobox on the page — the first is IngredientPicker's own).
      const comboboxes = screen.getAllByRole('combobox')
      fireEvent.mouseDown(comboboxes[1])
      await clickFreshestTitle(fixtureCategory.name)

      await waitFor(() => expect(createButton).not.toBeDisabled())
    })

    it('completing the sub-form calls useCreateIngredient with the typed name/chosen category, then onChange with the new ingredient selected and requiresSpecific true', async () => {
      const onCreateIngredient = vi.fn()
      stubFetch({ onCreateIngredient })
      const { onChange } = renderPicker({
        categoryId: undefined,
        ingredientId: null,
        requiresSpecific: false,
      })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Lemon Juice')
      fireEvent.click(await screen.findByTitle('+ Add new ingredient "Lemon Juice"'))

      const comboboxes = screen.getAllByRole('combobox')
      fireEvent.mouseDown(comboboxes[1])
      await clickFreshestTitle(fixtureCategory.name)

      const createButton = screen.getByRole('button', { name: 'Create' })
      await waitFor(() => expect(createButton).not.toBeDisabled())
      fireEvent.click(createButton)

      await waitFor(() =>
        expect(onCreateIngredient).toHaveBeenCalledWith({
          name: 'Lemon Juice',
          categoryId: fixtureCategory.id,
        }),
      )
      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith({
          categoryId: fixtureCategory.id,
          ingredientId: createdIngredientId,
          requiresSpecific: true,
        }),
      )
    })

    it('toggling the in-stock switch off before creating issues a stock-toggle call after creation', async () => {
      const onToggleStock = vi.fn()
      stubFetch({ onToggleStock })
      renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Lemon Juice')
      fireEvent.click(await screen.findByTitle('+ Add new ingredient "Lemon Juice"'))

      const comboboxes = screen.getAllByRole('combobox')
      fireEvent.mouseDown(comboboxes[1])
      await clickFreshestTitle(fixtureCategory.name)

      fireEvent.click(screen.getByRole('switch'))

      const createButton = screen.getByRole('button', { name: 'Create' })
      await waitFor(() => expect(createButton).not.toBeDisabled())
      fireEvent.click(createButton)

      await waitFor(() => expect(onToggleStock).toHaveBeenCalledWith(createdIngredientId, false))
    })

    it('"Cancel" dismisses the sub-form without calling useCreateIngredient or onChange', async () => {
      const onCreateIngredient = vi.fn()
      const fetchMock = stubFetch({ onCreateIngredient })
      const { onChange } = renderPicker({
        categoryId: undefined,
        ingredientId: null,
        requiresSpecific: false,
      })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Lemon Juice')
      fireEvent.click(await screen.findByTitle('+ Add new ingredient "Lemon Juice"'))

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByText('New ingredient:')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
      expect(onCreateIngredient).not.toHaveBeenCalled()
      expect(onChange).not.toHaveBeenCalled()
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => url === '/api/ingredients' && init?.method === 'POST',
        ),
      ).toBe(false)
    })
  })

  describe('inline category creation', () => {
    it('shows "+ Add new category" when typed text matches no existing category', async () => {
      stubFetch()
      renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Whiskey')

      expect(await screen.findByTitle('+ Add new category "Whiskey"')).toBeInTheDocument()
    })

    it('hides "+ Add new category" when typed text exactly matches an existing category name (any case)', async () => {
      stubFetch()
      renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'rum')

      await screen.findByTitle('Rum')
      expect(screen.queryByText(/\+ Add new category/)).not.toBeInTheDocument()
    })

    it('selecting "+ Add new category" creates and selects the category directly, without opening the ingredient sub-flow', async () => {
      const onCreateCategory = vi.fn()
      stubFetch({ onCreateCategory })
      const { onChange } = renderPicker({
        categoryId: undefined,
        ingredientId: null,
        requiresSpecific: false,
      })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Whiskey')
      fireEvent.click(await screen.findByTitle('+ Add new category "Whiskey"'))

      await waitFor(() => expect(onCreateCategory).toHaveBeenCalledWith({ name: 'Whiskey' }))
      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith({
          categoryId: createdCategoryId,
          ingredientId: null,
          requiresSpecific: false,
        }),
      )
      expect(screen.queryByText('New ingredient:')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
    })

    it('surfaces an error message if category creation fails', async () => {
      stubFetch({ createCategoryStatus: 500 })
      renderPicker({ categoryId: undefined, ingredientId: null, requiresSpecific: false })

      const combobox = await screen.findByRole('combobox')
      openPicker()
      await userEvent.type(combobox, 'Whiskey')
      fireEvent.click(await screen.findByTitle('+ Add new category "Whiskey"'))

      expect(
        await screen.findByText("Couldn't create category — check the name and try again."),
      ).toBeInTheDocument()
    })
  })
})
