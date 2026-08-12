import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CategoryPicker } from './CategoryPicker.js'

const FIXTURE_CATEGORIES = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Rum' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Gin' },
]

function stubFetch(onCreate?: (name: string) => { id: string; name: string }) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/categories' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => FIXTURE_CATEGORIES,
      } as Response)
    }

    if (url === '/api/categories' && method === 'POST') {
      const body = JSON.parse(init!.body as string) as { name: string }
      const created = onCreate
        ? onCreate(body.name)
        : { id: '33333333-3333-3333-3333-333333333333', name: body.name }
      return Promise.resolve({ ok: true, status: 201, json: async () => created } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPicker(props: {
  value?: string
  onChange?: (categoryId: string | undefined) => void
} = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CategoryPicker {...props} />
    </QueryClientProvider>,
  )
}

async function waitForCategoriesLoaded(fetchMock: ReturnType<typeof stubFetch>) {
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/categories')).toBe(true)
  })
}

describe('CategoryPicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('filters existing categories by a case-insensitive substring match as the user types', async () => {
    const fetchMock = stubFetch()
    renderPicker()
    await waitForCategoriesLoaded(fetchMock)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'RU' } })

    // Established antd Select/AutoComplete test pattern: the dropdown's
    // role="option" elements are a virtualization-only accessibility
    // mirror with no click handler — the real, clickable item carries a
    // `title` attribute instead (RecipeForm.test.tsx precedent).
    expect(await screen.findByTitle('Rum')).toBeInTheDocument()
    expect(screen.queryByTitle('Gin')).not.toBeInTheDocument()
  })

  it('does not show a "+ Add" option when the typed text exactly matches an existing category under any casing', async () => {
    const fetchMock = stubFetch()
    renderPicker()
    await waitForCategoriesLoaded(fetchMock)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'rUM' } })

    expect(await screen.findByTitle('Rum')).toBeInTheDocument()
    expect(screen.queryByText(/^\+ Add/)).not.toBeInTheDocument()
  })

  it('shows exactly one "+ Add" option for text matching no existing category; selecting it creates the category via useCreateCategory and reports the new id (never the literal __create__) via onChange', async () => {
    const fetchMock = stubFetch(() => ({
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Vodka',
    }))
    const onChange = vi.fn()
    renderPicker({ onChange })
    await waitForCategoriesLoaded(fetchMock)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Vodka' } })

    const addOption = await screen.findByTitle('+ Add "Vodka"')
    expect(screen.getAllByText('+ Add "Vodka"')).toHaveLength(1)

    fireEvent.click(addOption)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('44444444-4444-4444-4444-444444444444')
    })
    expect(onChange).not.toHaveBeenCalledWith('__create__')

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => url === '/api/categories' && (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(postCall).toBeDefined()
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toEqual({ name: 'Vodka' })
  })
})
