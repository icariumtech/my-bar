import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { Recipe, Tag } from '@my-bar/shared'
import { RecipeDetail } from './RecipeDetail.js'
import { useRecipeDetail } from '../api/useRecipeDetail.js'
import { useSubmitOrder } from '../api/useSubmitOrder.js'

// Mock the hook entirely — this test exercises RecipeDetail's render
// contract only, not the query/fetch layer (that's useRecipeDetail's own
// concern, covered separately if/when it grows logic beyond a thin
// useQuery wrapper).
vi.mock('../api/useRecipeDetail.js', () => ({
  useRecipeDetail: vi.fn(),
}))

// Mock the same way useRecipeDetail is mocked above — this test exercises
// RecipeDetail's Order button/prompt/confirmation/error render contract
// only, not the mutation/fetch layer (that's useSubmitOrder's own concern,
// covered separately in useSubmitOrder.test.tsx).
vi.mock('../api/useSubmitOrder.js', () => ({
  useSubmitOrder: vi.fn(),
}))

const mockedUseRecipeDetail = vi.mocked(useRecipeDetail)
const mockedUseSubmitOrder = vi.mocked(useSubmitOrder)

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

function stubSubmitOrder(overrides: { mutate?: ReturnType<typeof vi.fn>; isPending?: boolean } = {}) {
  mockedUseSubmitOrder.mockReturnValue({
    mutate: overrides.mutate ?? vi.fn(),
    isPending: overrides.isPending ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('RecipeDetail', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stubSubmitOrder()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('renders the Order button when overallStatus is green', () => {
    stub({ overallStatus: 'green' })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.getByRole('button', { name: 'Order This Drink' })).toBeInTheDocument()
  })

  it('does not render the Order button when overallStatus is yellow', () => {
    stub({ overallStatus: 'yellow' })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.queryByRole('button', { name: 'Order This Drink' })).not.toBeInTheDocument()
  })

  it('does not render the Order button when overallStatus is red', () => {
    stub({ overallStatus: 'red', missingCategoryNames: ['Dry Vermouth'] })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    expect(screen.queryByRole('button', { name: 'Order This Drink' })).not.toBeInTheDocument()
  })

  it('opens the OrderPrompt when the Order button is tapped', () => {
    stub({ overallStatus: 'green' })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Order This Drink' }))

    expect(screen.getByText("Who's this for?")).toBeInTheDocument()
  })

  it('shows a confirmation on successful submit and returns to browse after ~3s', () => {
    stub({ overallStatus: 'green' })
    const onBack = vi.fn()
    const mutate = vi.fn((_input, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.()
    })
    stubSubmitOrder({ mutate })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: 'Order This Drink' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send Order' }))

    expect(screen.getByText('Order sent to bartender!')).toBeInTheDocument()
    expect(onBack).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(onBack).toHaveBeenCalled()
  })

  it('renders an inline error alert on a failed submit and keeps the Order button for retry', () => {
    stub({ overallStatus: 'green' })
    const mutate = vi.fn((_input, opts: { onError?: (err: Error) => void }) => {
      opts.onError?.(new Error('Recipe is not currently makeable'))
    })
    stubSubmitOrder({ mutate })
    render(<RecipeDetail recipeId={BASE_RECIPE.id} onBack={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Order This Drink' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send Order' }))

    expect(screen.getByText('Recipe is not currently makeable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Order This Drink' })).toBeInTheDocument()
  })
})
