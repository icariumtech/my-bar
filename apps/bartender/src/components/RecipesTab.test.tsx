import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Recipe } from '@my-bar/shared'
import { RecipesTab } from './RecipesTab.js'
import { useRecipes } from '../api/useRecipes.js'

vi.mock('../api/useRecipes.js', () => ({
  useRecipes: vi.fn(),
}))

// Task 2 of this plan builds the real RecipeOrOrderDetail/RecipeSearchFilter
// components — mocked here per the plan's own stated alternative so this
// task's tests only assert RecipesTab's own navigation wiring, not those
// components' internals.
vi.mock('./RecipeOrOrderDetail.js', () => ({
  RecipeOrOrderDetail: (props: { recipe: Recipe }) => (
    <div data-testid="recipe-or-order-detail">{props.recipe.name}</div>
  ),
}))

vi.mock('./RecipeSearchFilter.js', () => ({
  RecipeSearchFilter: () => <div data-testid="recipe-search-filter" />,
}))

vi.mock('./MakeableStatusBadge.js', () => ({
  MakeableStatusBadge: () => <span data-testid="makeable-status-badge" />,
}))

const mockedUseRecipes = vi.mocked(useRecipes)

const FIXTURE_RECIPE: Recipe = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Daiquiri',
  ingredients: [],
  method: ['Shake with ice', 'Strain into a coupe'],
  glasswareId: null,
  glasswareName: null,
  garnish: null,
  description: null,
  tags: [],
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

function stub(overrides: Partial<ReturnType<typeof useRecipes>>) {
  mockedUseRecipes.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('RecipesTab', () => {
  it('renders a loading spinner while isPending', () => {
    stub({ isPending: true })
    render(<RecipesTab />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders an error message and a working Retry button on isError', () => {
    const refetch = vi.fn()
    stub({ isError: true, refetch })
    render(<RecipesTab />)

    expect(screen.getByText('Failed to load recipes. Check your connection.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it("renders every recipe's name in a list when populated", () => {
    stub({ data: [FIXTURE_RECIPE, FIXTURE_RECIPE_2] })
    render(<RecipesTab />)

    expect(screen.getByText(FIXTURE_RECIPE.name)).toBeInTheDocument()
    expect(screen.getByText(FIXTURE_RECIPE_2.name)).toBeInTheDocument()
  })

  it('tapping a recipe row transitions to the detail view, passing the tapped recipe', () => {
    stub({ data: [FIXTURE_RECIPE] })
    render(<RecipesTab />)

    fireEvent.click(screen.getByText(FIXTURE_RECIPE.name))

    expect(screen.getByTestId('recipe-or-order-detail')).toHaveTextContent(FIXTURE_RECIPE.name)
  })

  it('tapping the search/filter button transitions to the RecipeSearchFilter view', () => {
    stub({ data: [FIXTURE_RECIPE] })
    render(<RecipesTab />)

    fireEvent.click(screen.getByRole('button', { name: 'Search & Filter' }))

    expect(screen.getByTestId('recipe-search-filter')).toBeInTheDocument()
  })

  it('renders "No recipes match your search" when there are zero recipes', () => {
    stub({ data: [] })
    render(<RecipesTab />)

    expect(screen.getByText('No recipes match your search')).toBeInTheDocument()
  })
})
