import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Recipe, Tag } from '@my-bar/shared'
import { RecipeDetail } from './RecipeDetail.js'
import { useRecipeDetail } from '../api/useRecipeDetail.js'

// Mock the hook entirely — this test exercises RecipeDetail's render
// contract only, not the query/fetch layer (that's useRecipeDetail's own
// concern, covered separately if/when it grows logic beyond a thin
// useQuery wrapper).
vi.mock('../api/useRecipeDetail.js', () => ({
  useRecipeDetail: vi.fn(),
}))

const mockedUseRecipeDetail = vi.mocked(useRecipeDetail)

// Deliberately a different name than the ingredient's categoryName below
// ("Whiskey") to avoid a duplicate-text query collision — mirrors 03-02's
// own fixture-collision fix.
const CLASSIC: Tag = { id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Classic', group: 'type' }

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
  tags: [CLASSIC],
  overallStatus: 'green',
  missingCategoryIds: [],
  missingCategoryNames: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function stub(recipe: Partial<Recipe>) {
  mockedUseRecipeDetail.mockReturnValue({
    data: { ...BASE_RECIPE, ...recipe },
    isLoading: false,
    isError: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('RecipeDetail', () => {
  it('renders a missing-ingredients line with "Not Available" and the missing category name for a red recipe', () => {
    stub({ overallStatus: 'red', missingCategoryNames: ['Dry Vermouth'] })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.getByText(/Dry Vermouth missing\./)).toBeInTheDocument()
  })

  it('renders no missing-ingredients section for a yellow recipe with nothing truly missing (D-44)', () => {
    stub({ overallStatus: 'yellow', missingCategoryNames: [] })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.queryByText(/missing/i)).not.toBeInTheDocument()
  })

  it('renders with no description section for an empty-string description', () => {
    stub({ description: '' })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('renders with no description section for a null description', () => {
    stub({ description: null })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('renders the description text inside a description section when present', () => {
    stub({ description: 'A smooth classic.' })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('A smooth classic.')).toBeInTheDocument()
  })

  it('renders the tag row with zero pills and no error when tags is empty', () => {
    stub({ tags: [] })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.getByText('Old Fashioned')).toBeInTheDocument()
  })

  it("renders each ingredient line's categoryName and never renders quantity or unit", () => {
    stub({})
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.getByText('Whiskey')).toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('calls onBack when the back control is tapped', () => {
    stub({})
    const onBack = vi.fn()
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: /back/i }))

    expect(onBack).toHaveBeenCalled()
  })
})
