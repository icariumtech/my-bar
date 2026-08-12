import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Recipe } from '@my-bar/shared'
import { RecipesTab } from './RecipesTab.js'

const FIXTURE_RECIPE: Recipe = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Daiquiri',
  ingredients: [
    {
      id: 'aaaaaaaa-1111-1111-1111-111111111111',
      categoryId: 'cccccccc-1111-1111-1111-111111111111',
      ingredientId: null,
      requiresSpecific: false,
      quantity: '2',
      unit: 'oz',
      categoryName: 'Rum',
      ingredientName: null,
      displayOrder: 0,
      status: 'green',
      alternativeIngredientName: null,
    },
  ],
  method: ['Shake with ice', 'Strain into a coupe'],
  glasswareId: null,
  glasswareName: null,
  garnish: null,
  overallStatus: 'green',
  missingCategoryIds: [],
  missingCategoryNames: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const FIXTURE_RECIPE_2: Recipe = {
  ...FIXTURE_RECIPE,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Mojito',
}

function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/recipes' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [FIXTURE_RECIPE],
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// 260812-e8j regression guard: proves the lifted `query` state (moved from
// RecipeList up to RecipesTab so the title/Add-button row and the search
// Input can render together inside one sticky wrapper) still wires
// correctly end to end.
function stubFetchTwoRecipes() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/recipes' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [FIXTURE_RECIPE, FIXTURE_RECIPE_2],
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
      <RecipesTab />
    </QueryClientProvider>,
  )
}

describe('RecipesTab', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tapping a recipe row\'s view action renders the full-screen RecipeDetailView with no recipe list visible underneath', async () => {
    stubFetch()
    renderTab()

    fireEvent.click(await screen.findByRole('button', { name: `View ${FIXTURE_RECIPE.name}` }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add Recipe/ })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search recipes…')).not.toBeInTheDocument()
  })

  it('the back button returns to the recipe list', async () => {
    stubFetch()
    renderTab()

    fireEvent.click(await screen.findByRole('button', { name: `View ${FIXTURE_RECIPE.name}` }))
    fireEvent.click(await screen.findByRole('button', { name: /Back/ }))

    expect(await screen.findByRole('button', { name: /Add Recipe/ })).toBeInTheDocument()
  })

  it('typing a query into the lifted search Input filters RecipeList by name', async () => {
    stubFetchTwoRecipes()
    renderTab()

    expect(await screen.findByText(FIXTURE_RECIPE.name)).toBeInTheDocument()
    expect(await screen.findByText(FIXTURE_RECIPE_2.name)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search recipes…'), {
      target: { value: FIXTURE_RECIPE_2.name },
    })

    expect(await screen.findByText(FIXTURE_RECIPE_2.name)).toBeInTheDocument()
    expect(screen.queryByText(FIXTURE_RECIPE.name)).not.toBeInTheDocument()
  })
})
