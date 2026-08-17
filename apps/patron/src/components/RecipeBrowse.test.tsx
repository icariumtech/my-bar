import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Recipe, Tag } from '@my-bar/shared'
import { RecipeBrowse } from './RecipeBrowse.js'

// RecipeDetail owns its own independent data fetch (useRecipeDetail) —
// out of scope for this file's tests, which only assert that RecipeBrowse
// navigates to it with the right id and returns to the grid on its
// onBack callback. Mirrors App.test.tsx's identical mock-the-child
// pattern used to decouple from RecipeBrowse's own network concerns.
vi.mock('./RecipeDetail.js', () => ({
  RecipeDetail: ({ recipeId, onBack }: { recipeId: string; onBack: () => void }) => (
    <div>
      <p>Viewing {recipeId}</p>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

const WHISKEY: Tag = { id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Whiskey', group: 'spirit' }
const SWEET: Tag = { id: 'bbbbbbbb-0000-0000-0000-000000000002', name: 'Sweet', group: 'flavor' }

const BASE_RECIPE: Recipe = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Old Fashioned',
  ingredients: [
    {
      id: 'aaaaaaaa-1111-1111-1111-111111111111',
      categoryId: 'cccccccc-1111-1111-1111-111111111111',
      ingredientId: null,
      requiresSpecific: false,
      quantity: '2',
      unit: 'oz',
      categoryName: 'Whiskey',
      ingredientName: null,
      displayOrder: 0,
      status: 'green',
      alternativeIngredientName: null,
    },
  ],
  method: ['Stir with ice', 'Strain over a large cube'],
  glasswareId: null,
  glasswareName: null,
  garnish: null,
  description: null,
  tags: [WHISKEY],
  overallStatus: 'green',
  missingCategoryIds: [],
  missingCategoryNames: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const OTHER_RECIPE: Recipe = {
  ...BASE_RECIPE,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Daiquiri',
  tags: [SWEET],
}

function stubFetch(recipesOrStatus: Recipe[] | 'error') {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/recipes' && method === 'GET') {
      if (recipesOrStatus === 'error') {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'boom' }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => recipesOrStatus,
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderBrowse() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeBrowse />
    </QueryClientProvider>,
  )
}

describe('RecipeBrowse', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the exact "No drinks available" copy when the recipe list is empty', async () => {
    stubFetch([])
    renderBrowse()

    expect(await screen.findByText('No drinks available')).toBeInTheDocument()
    expect(
      screen.getByText('No recipes match this filter. Try browsing another category.'),
    ).toBeInTheDocument()
  })

  it('shows the exact "Something went wrong" copy with a working Retry button on a failed fetch', async () => {
    const fetchMock = stubFetch('error')
    renderBrowse()

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText('Failed to load drinks. Please check your connection and try again.'),
    ).toBeInTheDocument()

    const callsBeforeRetry = fetchMock.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry)
    })
  })

  it('renders both recipes and filters the grid down to only the selected tag', async () => {
    stubFetch([BASE_RECIPE, OTHER_RECIPE])
    renderBrowse()

    expect(await screen.findByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.getByText('Daiquiri')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Whiskey' }))

    expect(screen.getByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.queryByText('Daiquiri')).not.toBeInTheDocument()
  })

  it('hides a not-makeable recipe by default (available-only) and reveals it after toggling the availability filter', async () => {
    const notMakeable: Recipe = { ...OTHER_RECIPE, overallStatus: 'red' }
    stubFetch([BASE_RECIPE, notMakeable])
    renderBrowse()

    expect(await screen.findByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.queryByText('Daiquiri')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Availability filter' }))

    expect(screen.getByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.getByText('Daiquiri')).toBeInTheDocument()
  })

  it('combines the availability toggle and the tag filter with AND, not OR', async () => {
    const notMakeable: Recipe = { ...OTHER_RECIPE, overallStatus: 'red' }
    stubFetch([BASE_RECIPE, notMakeable])
    renderBrowse()

    expect(await screen.findByText('Old Fashioned')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Availability filter' }))
    expect(screen.getByText('Daiquiri')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Whiskey' }))

    expect(screen.getByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.queryByText('Daiquiri')).not.toBeInTheDocument()
  })

  it('shows RecipeDetail for the tapped card\'s id, then returns to the grid via its back control', async () => {
    stubFetch([BASE_RECIPE, OTHER_RECIPE])
    renderBrowse()

    expect(await screen.findByText('Old Fashioned')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Old Fashioned'))

    expect(screen.getByText(`Viewing ${BASE_RECIPE.id}`)).toBeInTheDocument()
    expect(screen.queryByText('Daiquiri')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(await screen.findByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.getByText('Daiquiri')).toBeInTheDocument()
  })
})
