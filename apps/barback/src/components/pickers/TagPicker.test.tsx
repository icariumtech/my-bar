import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TagPicker } from './TagPicker.js'

// Deliberately scrambled relative to TAG_GROUP_ORDER (spirit, type, season,
// flavor) — a flavor tag is listed before a spirit tag — so the assertions
// below only pass if TagPicker re-sorts by TAG_GROUP_ORDER rather than
// preserving the fetched array's order.
const FIXTURE_TAGS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Citrus', group: 'flavor' as const },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Gin', group: 'spirit' as const },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Summer', group: 'season' as const },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Shaken', group: 'type' as const },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Rum', group: 'spirit' as const },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Herbal', group: 'flavor' as const },
]

function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/tags' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => FIXTURE_TAGS,
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPicker(
  props: {
    value?: string[]
    onChange?: (tagIds: string[]) => void
  } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <TagPicker {...props} />
    </QueryClientProvider>,
  )
}

async function waitForTagsLoaded(fetchMock: ReturnType<typeof stubFetch>) {
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/tags')).toBe(true)
  })
}

// Reads the open dropdown's flat item list (group headers +options,
// rc-select's actual DOM order) and buckets each option under its nearest
// preceding group header — the only way to assert both "groups render in
// TAG_GROUP_ORDER sequence" and "each group contains only that group's
// tags" without relying on internal antd class-name/DOM assumptions beyond
// the ones GlasswarePicker.test.tsx/CategoryPicker.test.tsx already lean on
// (title attribute per rendered item).
function readGroupedDropdown(): Record<string, string[]> {
  const items = Array.from(document.querySelectorAll('.ant-select-item'))
  const grouped: Record<string, string[]> = {}
  let currentGroup: string | null = null

  for (const item of items) {
    if (item.classList.contains('ant-select-item-group')) {
      currentGroup = item.textContent ?? ''
      grouped[currentGroup] = []
    } else if (currentGroup) {
      grouped[currentGroup]!.push(item.getAttribute('title') ?? '')
    }
  }

  return grouped
}

describe('TagPicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders four option-groups in TAG_GROUP_ORDER sequence, each containing only that group\'s tags, regardless of fetched array order', async () => {
    const fetchMock = stubFetch()
    renderPicker()
    await waitForTagsLoaded(fetchMock)

    const combobox = screen.getByRole('combobox')
    fireEvent.mouseDown(combobox)
    await screen.findByTitle('Gin')

    const grouped = readGroupedDropdown()

    expect(Object.keys(grouped)).toEqual(['Spirit', 'Type', 'Season', 'Flavor'])
    expect(grouped['Spirit']).toEqual(['Gin', 'Rum'])
    expect(grouped['Type']).toEqual(['Shaken'])
    expect(grouped['Season']).toEqual(['Summer'])
    expect(grouped['Flavor']).toEqual(['Citrus', 'Herbal'])
  })

  it('selecting two tags from different groups reports both ids via onChange as a string[], order-independent', async () => {
    const fetchMock = stubFetch()
    const onChange = vi.fn()
    renderPicker({ onChange })
    await waitForTagsLoaded(fetchMock)

    const combobox = screen.getByRole('combobox')
    fireEvent.mouseDown(combobox)
    fireEvent.click(await screen.findByTitle('Gin'))
    fireEvent.click(await screen.findByTitle('Citrus'))

    await waitFor(() => {
      const lastCall = onChange.mock.calls.at(-1)?.[0] as string[] | undefined
      expect(lastCall).toBeDefined()
      expect([...lastCall!].sort()).toEqual(
        [FIXTURE_TAGS[1]!.id, FIXTURE_TAGS[0]!.id].sort(),
      )
    })
  })

  it('never renders a "+ Add" create-new option, even when typed text matches no existing tag name', async () => {
    const fetchMock = stubFetch()
    renderPicker()
    await waitForTagsLoaded(fetchMock)

    const combobox = screen.getByRole('combobox')
    fireEvent.mouseDown(combobox)
    fireEvent.change(combobox, { target: { value: 'Nonexistent Tag Name' } })

    await waitFor(() => {
      expect(screen.queryByText(/^\+ Add/)).not.toBeInTheDocument()
    })
  })
})
