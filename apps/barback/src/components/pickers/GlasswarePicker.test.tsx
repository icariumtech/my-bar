import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GlasswarePicker } from './GlasswarePicker.js'

const FIXTURE_GLASSWARE = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Coupe' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Rocks' },
]

function stubFetch(onCreate?: (name: string) => { id: string; name: string }) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/glassware' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => FIXTURE_GLASSWARE,
      } as Response)
    }

    if (url === '/api/glassware' && method === 'POST') {
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

function renderPicker(
  props: {
    value?: string
    onChange?: (glasswareId: string | undefined) => void
  } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <GlasswarePicker {...props} />
    </QueryClientProvider>,
  )
}

async function waitForGlasswareLoaded(fetchMock: ReturnType<typeof stubFetch>) {
  await waitFor(() => {
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/glassware')).toBe(true)
  })
}

describe('GlasswarePicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('filters existing glassware by a case-insensitive substring match as the user types', async () => {
    const fetchMock = stubFetch()
    renderPicker()
    await waitForGlasswareLoaded(fetchMock)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'cou' } })

    expect(await screen.findByTitle('Coupe')).toBeInTheDocument()
    expect(screen.queryByTitle('Rocks')).not.toBeInTheDocument()
  })

  it('does not show a "+ Add" option when the typed text exactly matches an existing glassware under any casing', async () => {
    const fetchMock = stubFetch()
    renderPicker()
    await waitForGlasswareLoaded(fetchMock)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'COUPE' } })

    expect(await screen.findByTitle('Coupe')).toBeInTheDocument()
    expect(screen.queryByText(/^\+ Add/)).not.toBeInTheDocument()
  })

  it('shows exactly one "+ Add" option for text matching no existing glassware; selecting it creates the glassware via useCreateGlassware and reports the new id via onChange', async () => {
    const fetchMock = stubFetch(() => ({
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Highball',
    }))
    const onChange = vi.fn()
    renderPicker({ onChange })
    await waitForGlasswareLoaded(fetchMock)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Highball' } })

    const addOption = await screen.findByTitle('+ Add "Highball"')
    expect(screen.getAllByText('+ Add "Highball"')).toHaveLength(1)

    fireEvent.click(addOption)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('44444444-4444-4444-4444-444444444444')
    })
    expect(onChange).not.toHaveBeenCalledWith('__create__')

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === '/api/glassware' && (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(postCall).toBeDefined()
    expect(JSON.parse((postCall![1] as RequestInit).body as string)).toEqual({ name: 'Highball' })
  })

  it('calls onChange with undefined when the field is cleared', async () => {
    const fetchMock = stubFetch()
    const onChange = vi.fn()
    renderPicker({ value: FIXTURE_GLASSWARE[0].id, onChange })
    await waitForGlasswareLoaded(fetchMock)

    expect(await screen.findByDisplayValue('Coupe')).toBeInTheDocument()

    const clearIcon = document.querySelector('.ant-select-clear')
    expect(clearIcon).not.toBeNull()
    fireEvent.mouseDown(clearIcon!)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(undefined)
    })
  })
})
