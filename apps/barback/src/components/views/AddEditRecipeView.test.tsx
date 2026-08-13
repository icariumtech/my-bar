import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Category, Glassware, Ingredient, Recipe, Tag } from '@my-bar/shared'
import { AddEditRecipeView } from './AddEditRecipeView.js'

// Re-implements RecipeForm.test.tsx's three prior cases (G-02-6 regression
// guards) against AddEditRecipeView, updated for the new picker components:
// the recipe-ingredient line's category-or-specific-ingredient field is now
// the combined IngredientPicker (grouped AutoComplete, select a category
// option) instead of the old plain category <Select>, and glassware is now
// GlasswarePicker (AutoComplete) instead of the old GlasswareSelector
// <Select>. Interaction pattern (mousedown to open, click the rendered
// option by title — the dropdown's role="option" elements are a
// virtualization-only accessibility mirror with no click handler) carried
// over unchanged from RecipeForm.test.tsx/IngredientPicker.test.tsx.

const fixtureCategory: Category = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Spirits',
}

const fixtureIngredient: Ingredient = {
  id: '55555555-5555-5555-5555-555555555555',
  name: 'Bombay Sapphire',
  categoryId: fixtureCategory.id,
  categoryName: fixtureCategory.name,
  note: null,
  inStock: true,
}

const fixtureGlassware: Glassware = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Coupe',
}

const fixtureTags: Tag[] = [
  { id: '77777777-7777-7777-7777-777777777777', name: 'Gin', group: 'spirit' },
  { id: '88888888-8888-8888-8888-888888888888', name: 'Citrus', group: 'flavor' },
]

const fixtureRecipeResponse: Recipe = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Test Cocktail',
  ingredients: [
    {
      id: '44444444-4444-4444-4444-444444444444',
      categoryId: fixtureCategory.id,
      categoryName: fixtureCategory.name,
      ingredientId: null,
      requiresSpecific: false,
      ingredientName: null,
      status: 'green',
      alternativeIngredientName: null,
      quantity: '2',
      unit: 'oz',
      displayOrder: 0,
    },
  ],
  method: ['Shake and strain'],
  glasswareId: fixtureGlassware.id,
  glasswareName: fixtureGlassware.name,
  garnish: null,
  description: null,
  tags: [],
  overallStatus: 'green',
  missingCategoryIds: [],
  missingCategoryNames: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

let capturedBody:
  | {
      ingredients: { unit?: string; ingredientId?: string | null; requiresSpecific?: boolean }[]
      glasswareId?: string
      description?: string
      tagIds?: string[]
    }
  | undefined

function stubFetch(recipeResponse: Recipe = fixtureRecipeResponse) {
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

    if (url === '/api/glassware' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [fixtureGlassware],
      } as Response)
    }

    if (url === '/api/tags' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => fixtureTags,
      } as Response)
    }

    if (url === '/api/recipes' && method === 'POST') {
      capturedBody = JSON.parse(init!.body as string)
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => recipeResponse,
      } as Response)
    }

    if (url === `/api/recipes/${recipeResponse.id}` && method === 'PATCH') {
      capturedBody = JSON.parse(init!.body as string)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => recipeResponse,
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderView(recipe?: Recipe, onBack: () => void = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AddEditRecipeView recipe={recipe} onBack={onBack} />
    </QueryClientProvider>,
  )
}

// GlasswarePicker/TagPicker are both rendered unconditionally, so
// /api/glassware and /api/tags fetch at mount. IngredientPicker only mounts
// once a row exists (IngredientListForm deliberately does not auto-seed a
// row — RECIPE-01's `.min(1)` requires real owner-entered data), so
// /api/categories and /api/ingredients only fetch after "Add Ingredient" is
// clicked — waited for separately inside fillBaseRecipe below, not here.
async function waitForReferenceDataLoaded(fetchMock: ReturnType<typeof stubFetch>) {
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/glassware')).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tags')).toBe(true)
  })
}

async function waitForIngredientPickerDataLoaded(fetchMock: ReturnType<typeof stubFetch>) {
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/categories')).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/ingredients')).toBe(true)
  })
}

// Fills name + one ingredient row (category via IngredientPicker/qty/unit)
// + one method step. Does NOT touch glassware — callers select it
// separately when needed. Combobox DOM order: [0] IngredientPicker (row 0),
// [1] UnitDropdown (row 0), [2] GlasswarePicker.
async function fillBaseRecipe(fetchMock: ReturnType<typeof stubFetch>) {
  fireEvent.change(screen.getByLabelText('Recipe Name'), {
    target: { value: 'Test Cocktail' },
  })

  fireEvent.click(screen.getByRole('button', { name: /Add Ingredient/ }))
  await waitForIngredientPickerDataLoaded(fetchMock)

  let comboboxes = screen.getAllByRole('combobox')
  fireEvent.mouseDown(comboboxes[0])
  fireEvent.click(await screen.findByTitle(fixtureCategory.name))

  fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '2' } })

  comboboxes = screen.getAllByRole('combobox')
  fireEvent.mouseDown(comboboxes[1])
  fireEvent.click(await screen.findByTitle('oz'))

  fireEvent.click(screen.getByRole('button', { name: /Add Step/ }))
  fireEvent.change(screen.getByPlaceholderText('Step 1'), {
    target: { value: 'Shake and strain' },
  })
}

describe('AddEditRecipeView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    capturedBody = undefined
  })

  it('renders no role="dialog" element and does render a "Back" button', async () => {
    stubFetch()
    renderView()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('submits the selected unit as its real value, not undefined (G-02-6)', async () => {
    const fetchMock = stubFetch()
    renderView()
    await waitForReferenceDataLoaded(fetchMock)

    await fillBaseRecipe(fetchMock)

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    await waitFor(() => expect(capturedBody).toBeDefined())
    expect(capturedBody!.ingredients[0].unit).toBe('oz')
  })

  it('submits the selected glasswareId as its real value, not undefined (G-02-6)', async () => {
    const fetchMock = stubFetch()
    renderView()
    await waitForReferenceDataLoaded(fetchMock)

    await fillBaseRecipe(fetchMock)

    const comboboxes = screen.getAllByRole('combobox')
    fireEvent.mouseDown(comboboxes[2])
    fireEvent.click(await screen.findByTitle(fixtureGlassware.name))

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    await waitFor(() => expect(capturedBody).toBeDefined())
    expect(capturedBody!.glasswareId).toBe(fixtureGlassware.id)
  })

  it("shows the server's real validation message in the save-failure Alert, not the generic connection copy (G-02-6)", async () => {
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
      if (url === '/api/glassware' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [fixtureGlassware],
        } as Response)
      }
      if (url === '/api/tags' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => fixtureTags,
        } as Response)
      }
      if (url === '/api/recipes' && method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: 'Recipe name is required' }),
        } as Response)
      }
      return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    renderView()
    await waitForReferenceDataLoaded(fetchMock)
    await fillBaseRecipe(fetchMock)

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    expect(await screen.findByText('Recipe name is required')).toBeInTheDocument()
    expect(
      screen.queryByText("Couldn't save recipe — check your connection and try again."),
    ).not.toBeInTheDocument()
  })

  it('selecting a specific ingredient (not just a category) sends ingredientId/requiresSpecific: true in the POST body', async () => {
    const fetchMock = stubFetch()
    renderView()
    await waitForReferenceDataLoaded(fetchMock)

    fireEvent.change(screen.getByLabelText('Recipe Name'), {
      target: { value: 'Test Cocktail' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Add Ingredient/ }))
    await waitForIngredientPickerDataLoaded(fetchMock)

    let comboboxes = screen.getAllByRole('combobox')
    fireEvent.mouseDown(comboboxes[0])
    fireEvent.click(
      await screen.findByTitle(`${fixtureIngredient.name} (${fixtureCategory.name})`),
    )

    fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '2' } })

    comboboxes = screen.getAllByRole('combobox')
    fireEvent.mouseDown(comboboxes[1])
    fireEvent.click(await screen.findByTitle('oz'))

    fireEvent.click(screen.getByRole('button', { name: /Add Step/ }))
    fireEvent.change(screen.getByPlaceholderText('Step 1'), {
      target: { value: 'Shake and strain' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    await waitFor(() => expect(capturedBody).toBeDefined())
    expect(capturedBody!.ingredients[0].ingredientId).toBe(fixtureIngredient.id)
    expect(capturedBody!.ingredients[0].requiresSpecific).toBe(true)
  })

  it('editing a recipe with 2 tags and a description pre-fills both fields from the server response', async () => {
    const editRecipe: Recipe = {
      ...fixtureRecipeResponse,
      description: 'A smooth, sippable classic.',
      tags: fixtureTags,
    }
    const fetchMock = stubFetch(editRecipe)
    renderView(editRecipe)
    await waitForReferenceDataLoaded(fetchMock)

    expect(
      await screen.findByDisplayValue('A smooth, sippable classic.'),
    ).toBeInTheDocument()

    for (const tag of fixtureTags) {
      expect(await screen.findByTitle(tag.name)).toBeInTheDocument()
    }
  })

  it('re-saving an edited recipe unchanged round-trips the same tagIds/description back (D-40/D-33)', async () => {
    const editRecipe: Recipe = {
      ...fixtureRecipeResponse,
      description: 'A smooth, sippable classic.',
      tags: fixtureTags,
    }
    const fetchMock = stubFetch(editRecipe)
    renderView(editRecipe)
    await waitForReferenceDataLoaded(fetchMock)
    await screen.findByDisplayValue('A smooth, sippable classic.')

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    await waitFor(() => expect(capturedBody).toBeDefined())
    expect(capturedBody!.description).toBe('A smooth, sippable classic.')
    expect([...capturedBody!.tagIds!].sort()).toEqual(
      fixtureTags.map((t) => t.id).sort(),
    )
  })

  it('saves successfully with zero tags and an empty description (D-35/D-40 — both optional)', async () => {
    const fetchMock = stubFetch()
    const onBack = vi.fn()
    renderView(undefined, onBack)
    await waitForReferenceDataLoaded(fetchMock)

    await fillBaseRecipe(fetchMock)

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    await waitFor(() => expect(onBack).toHaveBeenCalled())
    expect(
      screen.queryByText("Couldn't save recipe — check your connection and try again."),
    ).not.toBeInTheDocument()
    expect(capturedBody!.tagIds ?? []).toEqual([])
  })
})
