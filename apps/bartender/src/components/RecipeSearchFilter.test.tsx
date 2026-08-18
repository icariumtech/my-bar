import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Recipe, Tag, TagGroup } from '@my-bar/shared'
import { filterRecipes, RecipeSearchFilter } from './RecipeSearchFilter.js'
import { useTags } from '../api/useTags.js'

vi.mock('../api/useTags.js', () => ({
  useTags: vi.fn(),
}))

const mockedUseTags = vi.mocked(useTags)

function tag(id: string, name: string, group: TagGroup): Tag {
  return { id, name, group }
}

const GIN = tag('11111111-0000-0000-0000-000000000001', 'Gin', 'spirit')
const RUM = tag('11111111-0000-0000-0000-000000000002', 'Rum', 'spirit')
const DRY = tag('11111111-0000-0000-0000-000000000003', 'Dry', 'flavor')
const SOUR = tag('11111111-0000-0000-0000-000000000004', 'Sour', 'flavor')

function recipeFixture(id: string, name: string, tags: Tag[]): Recipe {
  return {
    id,
    name,
    ingredients: [],
    method: ['Stir'],
    glasswareId: null,
    glasswareName: null,
    garnish: null,
    description: null,
    tags,
    overallStatus: 'green',
    missingCategoryIds: [],
    missingCategoryNames: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }
}

const MARTINI = recipeFixture('1', 'Martini', [GIN, DRY])
const DAIQUIRI = recipeFixture('2', 'Daiquiri', [RUM, SOUR])
const OLD_FASHIONED = recipeFixture('3', 'Old Fashioned', [])
const GIN_SOUR = recipeFixture('4', 'Gin Sour', [GIN, SOUR])

function emptyGroups(): Record<TagGroup, Set<string>> {
  return { spirit: new Set(), type: new Set(), season: new Set(), flavor: new Set() }
}

describe('filterRecipes', () => {
  const ALL = [MARTINI, DAIQUIRI, OLD_FASHIONED, GIN_SOUR]

  it('returns every recipe when the query is empty and no tags are selected', () => {
    expect(filterRecipes(ALL, '', emptyGroups())).toEqual(ALL)
  })

  it('matches by name case-insensitively, ignoring leading/trailing whitespace', () => {
    expect(filterRecipes(ALL, '  MARTINI  ', emptyGroups())).toEqual([MARTINI])
  })

  it('combines two tags selected in the SAME group with OR', () => {
    const groups = { ...emptyGroups(), spirit: new Set([GIN.id, RUM.id]) }
    const result = filterRecipes(ALL, '', groups)
    expect(result.map((r) => r.id).sort()).toEqual(['1', '2', '4'])
  })

  it('combines tags selected across DIFFERENT groups with AND', () => {
    const groups = { ...emptyGroups(), spirit: new Set([GIN.id]), flavor: new Set([SOUR.id]) }
    const result = filterRecipes(ALL, '', groups)
    expect(result).toEqual([GIN_SOUR])
  })

  it('combines a name query AND a tag selection restrictively', () => {
    const groups = { ...emptyGroups(), spirit: new Set([GIN.id]) }
    const result = filterRecipes(ALL, 'daiquiri', groups)
    expect(result).toEqual([])
  })
})

function stubTags(tags: Tag[]) {
  mockedUseTags.mockReturnValue({ data: tags } as ReturnType<typeof useTags>)
}

describe('RecipeSearchFilter', () => {
  it('renders a name search input and one expandable section per tag group, in TAG_GROUP_ORDER', () => {
    stubTags([GIN, RUM, DRY, SOUR])
    render(<RecipeSearchFilter recipes={[]} onApply={vi.fn()} onBack={vi.fn()} />)

    expect(screen.getByPlaceholderText('Recipe name…')).toBeInTheDocument()
    const groupLabels = screen.getAllByText(/^Spirit$|^Type$|^Season$|^Flavor$/)
    expect(groupLabels.map((el) => el.textContent)).toEqual(['Spirit', 'Type', 'Season', 'Flavor'])
  })

  it('tapping Apply calls onApply with the matching recipe ids', () => {
    stubTags([GIN, RUM, DRY, SOUR])
    const onApply = vi.fn()
    render(<RecipeSearchFilter recipes={[MARTINI, DAIQUIRI]} onApply={onApply} onBack={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith(new Set(['1', '2']))
  })

  it('tapping Back calls onBack without calling onApply', () => {
    stubTags([])
    const onApply = vi.fn()
    const onBack = vi.fn()
    render(<RecipeSearchFilter recipes={[]} onApply={onApply} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })
})
