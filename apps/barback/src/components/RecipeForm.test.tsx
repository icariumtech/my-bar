import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Category, Glassware, Recipe } from '@my-bar/shared'
import { RecipeForm } from './RecipeForm.js'

// G-02-6 regression guard: UnitDropdown/GlasswareSelector used to discard
// Form.Item's injected value/onChange, so every submitted ingredient's
// `unit` and the recipe's `glasswareId` were always undefined at POST time.
// These tests drive the real form through antd's Select interaction
// pattern (mousedown to open, click the rendered option) and assert the
// real chosen values reach the captured POST body — not undefined.

const fixtureCategory: Category = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Spirits',
}

const fixtureGlassware: Glassware = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Coupe',
}

const fixtureRecipeResponse: Recipe = {
  id: '33333333-3333-3333-3333-333333333333',
  name: 'Test Cocktail',
  ingredients: [
    {
      id: '44444444-4444-4444-4444-444444444444',
      categoryId: fixtureCategory.id,
      categoryName: fixtureCategory.name,
      quantity: '2',
      unit: 'oz',
      displayOrder: 0,
    },
  ],
  method: ['Shake and strain'],
  glasswareId: fixtureGlassware.id,
  glasswareName: fixtureGlassware.name,
  garnish: null,
  makeable: true,
  missingCategoryIds: [],
  missingCategoryNames: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

let capturedBody: { ingredients: { unit?: string }[]; glasswareId?: string } | undefined

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

    if (url === '/api/glassware' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [fixtureGlassware],
      } as Response)
    }

    if (url === '/api/recipes' && method === 'POST') {
      capturedBody = JSON.parse(init!.body as string)
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => fixtureRecipeResponse,
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeForm open onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

async function waitForReferenceDataLoaded(fetchMock: ReturnType<typeof stubFetch>) {
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/categories')).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/glassware')).toBe(true)
  })
}

// Fills name + one ingredient row (category/qty/unit) + one method step.
// Does NOT touch glassware — callers select it separately when needed.
async function fillBaseRecipe() {
  fireEvent.change(screen.getByLabelText('Recipe Name'), {
    target: { value: 'Test Cocktail' },
  })

  fireEvent.click(screen.getByRole('button', { name: /Add Ingredient/ }))

  // antd 6's Select renders its own inline markup (no rc-select
  // `.ant-select-selector` class) — the reliable, version-stable hook to
  // open a Select is the underlying `role="combobox"` input it renders.
  // DOM order matches render order: category select, then unit select,
  // then (once reached) the glassware select.
  //
  // The dropdown's `role="option"` elements are a virtualization-only
  // accessibility mirror with no click handler (rc-virtual-list keeps the
  // real, clickable item as a plain `.ant-select-item-option` div carrying
  // a `title` attribute instead) — click by title, not by role.
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

describe('RecipeForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    capturedBody = undefined
  })

  it('submits the selected unit as its real value, not undefined (G-02-6)', async () => {
    const fetchMock = stubFetch()
    renderForm()
    await waitForReferenceDataLoaded(fetchMock)

    await fillBaseRecipe()

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    await waitFor(() => expect(capturedBody).toBeDefined())
    expect(capturedBody!.ingredients[0].unit).toBe('oz')
  })

  it('submits the selected glasswareId as its real value, not undefined (G-02-6)', async () => {
    const fetchMock = stubFetch()
    renderForm()
    await waitForReferenceDataLoaded(fetchMock)

    await fillBaseRecipe()

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
      if (url === '/api/glassware' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [fixtureGlassware],
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

    renderForm()
    await waitForReferenceDataLoaded(fetchMock)
    await fillBaseRecipe()

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }))

    expect(await screen.findByText('Recipe name is required')).toBeInTheDocument()
    expect(
      screen.queryByText("Couldn't save recipe — check your connection and try again."),
    ).not.toBeInTheDocument()
  })
})
