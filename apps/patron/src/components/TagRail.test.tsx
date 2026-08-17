import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Recipe, Tag } from '@my-bar/shared'
import { TagRail, getActiveTagIds, filterRecipesByTag, filterRecipesByAvailability } from './TagRail.js'

// D-33/D-34: fixed 4-group taxonomy. WHISKEY sits in 'spirit', SWEET in
// 'flavor' — the fixtures below deliberately never populate 'type' or
// 'season' tags, so those two groups exercise the D-36 "zero active tags"
// muted-icon path in every render test.
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
  tags: [],
  overallStatus: 'green',
  missingCategoryIds: [],
  missingCategoryNames: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function recipe(overrides: Partial<Recipe>): Recipe {
  return { ...BASE_RECIPE, ...overrides }
}

describe('getActiveTagIds', () => {
  it('returns an empty Set for an empty recipe list', () => {
    expect(getActiveTagIds([])).toEqual(new Set())
  })

  it('collects every unique tag id referenced across all recipes', () => {
    const recipes = [
      recipe({ id: 'r1', tags: [WHISKEY] }),
      recipe({ id: 'r2', tags: [WHISKEY] }),
      recipe({ id: 'r3', tags: [SWEET] }),
    ]

    expect(getActiveTagIds(recipes)).toEqual(new Set([WHISKEY.id, SWEET.id]))
  })
})

describe('filterRecipesByTag', () => {
  const recipes = [
    recipe({ id: 'r1', tags: [WHISKEY] }),
    recipe({ id: 'r2', tags: [WHISKEY] }),
    recipe({ id: 'r3', tags: [SWEET] }),
  ]

  it('returns all recipes unchanged when tagId is undefined', () => {
    expect(filterRecipesByTag(recipes, undefined)).toBe(recipes)
  })

  it('returns only recipes carrying the given tag id', () => {
    expect(filterRecipesByTag(recipes, WHISKEY.id)).toEqual([recipes[0], recipes[1]])
    expect(filterRecipesByTag(recipes, SWEET.id)).toEqual([recipes[2]])
  })
})

describe('filterRecipesByAvailability', () => {
  const recipes = [
    recipe({ id: 'r1', overallStatus: 'green' }),
    recipe({ id: 'r2', overallStatus: 'yellow' }),
    recipe({ id: 'r3', overallStatus: 'red' }),
  ]

  it('returns all recipes unchanged (same array reference) when showAvailableOnly is false', () => {
    expect(filterRecipesByAvailability(recipes, false)).toBe(recipes)
  })

  it('returns only overallStatus "green" recipes when showAvailableOnly is true', () => {
    expect(filterRecipesByAvailability(recipes, true)).toEqual([recipes[0]])
  })
})

describe('TagRail', () => {
  const fixtureRecipes = [
    recipe({ id: 'r1', tags: [WHISKEY] }),
    recipe({ id: 'r2', tags: [SWEET] }),
  ]

  it('renders an inactive group (zero active tags) muted, and tapping it never reveals a TagSubmenu (D-36)', () => {
    render(
      <TagRail
        recipes={fixtureRecipes}
        selectedTagId={undefined}
        onSelectTag={vi.fn()}
        showAvailableOnly={true}
        onToggleAvailableOnly={vi.fn()}
      />,
    )

    const typeButton = screen.getByRole('button', { name: 'Type' })
    expect(typeButton).toHaveClass('opacity-40')

    fireEvent.click(typeButton)

    expect(screen.queryByText('Whiskey')).not.toBeInTheDocument()
    expect(screen.queryByText('Sweet')).not.toBeInTheDocument()
  })

  it('calls onSelectTag(tagId) exactly once when tapping an active tag inside an expanded submenu', () => {
    const onSelectTag = vi.fn()
    render(
      <TagRail
        recipes={fixtureRecipes}
        selectedTagId={undefined}
        onSelectTag={onSelectTag}
        showAvailableOnly={true}
        onToggleAvailableOnly={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
    fireEvent.click(screen.getByText('Whiskey'))

    expect(onSelectTag).toHaveBeenCalledTimes(1)
    expect(onSelectTag).toHaveBeenCalledWith(WHISKEY.id)
  })

  it('calls onSelectTag(undefined) when re-tapping the already-selected tag (clear, distinct from D-37 replace)', () => {
    const onSelectTag = vi.fn()
    render(
      <TagRail
        recipes={fixtureRecipes}
        selectedTagId={WHISKEY.id}
        onSelectTag={onSelectTag}
        showAvailableOnly={true}
        onToggleAvailableOnly={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
    fireEvent.click(screen.getByText('Whiskey'))

    expect(onSelectTag).toHaveBeenCalledTimes(1)
    expect(onSelectTag).toHaveBeenCalledWith(undefined)
  })

  it('calls onSelectTag(newTagId) when tapping a different tag while one is already selected (D-37 replace, never combine)', () => {
    const onSelectTag = vi.fn()
    render(
      <TagRail
        recipes={fixtureRecipes}
        selectedTagId={WHISKEY.id}
        onSelectTag={onSelectTag}
        showAvailableOnly={true}
        onToggleAvailableOnly={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Flavor' }))
    fireEvent.click(screen.getByText('Sweet'))

    expect(onSelectTag).toHaveBeenCalledTimes(1)
    expect(onSelectTag).toHaveBeenCalledWith(SWEET.id)
  })

  describe('flyout mechanics', () => {
    it('clicking a different group button closes the first flyout and opens the second', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
      expect(screen.getByText('Whiskey')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Flavor' }))
      expect(screen.queryByText('Whiskey')).not.toBeInTheDocument()
      expect(screen.getByText('Sweet')).toBeInTheDocument()
    })

    it('clicking the same group button twice closes its own flyout (toggle-to-close)', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      const spiritButton = screen.getByRole('button', { name: 'Spirit' })
      fireEvent.click(spiritButton)
      expect(screen.getByText('Whiskey')).toBeInTheDocument()

      fireEvent.click(spiritButton)
      expect(screen.queryByText('Whiskey')).not.toBeInTheDocument()
    })

    it('mousedown outside the rail closes the open flyout', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
      expect(screen.getByText('Whiskey')).toBeInTheDocument()

      fireEvent.mouseDown(document.body)
      expect(screen.queryByText('Whiskey')).not.toBeInTheDocument()
    })

    it('Escape keydown closes the open flyout', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
      expect(screen.getByText('Whiskey')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByText('Whiskey')).not.toBeInTheDocument()
    })
  })

  describe('persistent selection highlight', () => {
    it('shows aria-pressed="true" on the owning group button with no flyout opened at all', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={WHISKEY.id}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Spirit' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('keeps aria-pressed="true" on the owning group button after opening a different group flyout', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={WHISKEY.id}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Flavor' }))

      expect(screen.getByRole('button', { name: 'Spirit' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('shows aria-pressed="false" on every active group button when selectedTagId is undefined', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Spirit' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
      expect(screen.getByRole('button', { name: 'Flavor' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })
  })

  describe('settings flyout', () => {
    it('renders a gear button labeled "Settings" and shows no flyout content before clicking', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
      expect(screen.queryByText('Settings', { selector: 'h2' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Show all recipes')).not.toBeInTheDocument()
    })

    it('opens a flyout with a heading and checkbox when the gear button is clicked', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

      expect(screen.getByText('Settings', { selector: 'h2' })).toBeInTheDocument()
      expect(screen.getByLabelText('Show all recipes')).toBeInTheDocument()
    })

    it('checkbox is unchecked when showAvailableOnly is true and checked when showAvailableOnly is false', () => {
      const { unmount } = render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
      expect(screen.getByLabelText('Show all recipes')).not.toBeChecked()
      unmount()

      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={false}
          onToggleAvailableOnly={vi.fn()}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
      expect(screen.getByLabelText('Show all recipes')).toBeChecked()
    })

    it('calls onToggleAvailableOnly exactly once when the checkbox is clicked, and keeps the flyout open', () => {
      const onToggleAvailableOnly = vi.fn()
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={onToggleAvailableOnly}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
      fireEvent.click(screen.getByLabelText('Show all recipes'))

      expect(onToggleAvailableOnly).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Settings', { selector: 'h2' })).toBeInTheDocument()
    })

    it('opening a tag-group flyout while Settings is open closes Settings, and vice versa', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
      expect(screen.getByText('Whiskey')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
      expect(screen.queryByText('Whiskey')).not.toBeInTheDocument()
      expect(screen.getByText('Settings', { selector: 'h2' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Spirit' }))
      expect(screen.getByText('Whiskey')).toBeInTheDocument()
      expect(screen.queryByText('Settings', { selector: 'h2' })).not.toBeInTheDocument()
    })

    it('clicking the gear button twice closes its own flyout (toggle-to-close)', () => {
      render(
        <TagRail
          recipes={fixtureRecipes}
          selectedTagId={undefined}
          onSelectTag={vi.fn()}
          showAvailableOnly={true}
          onToggleAvailableOnly={vi.fn()}
        />,
      )

      const settingsButton = screen.getByRole('button', { name: 'Settings' })
      fireEvent.click(settingsButton)
      expect(screen.getByText('Settings', { selector: 'h2' })).toBeInTheDocument()

      fireEvent.click(settingsButton)
      expect(screen.queryByText('Settings', { selector: 'h2' })).not.toBeInTheDocument()
    })
  })
})
