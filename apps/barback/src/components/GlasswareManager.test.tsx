import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { GlasswareManager } from './GlasswareManager.js'

// D-24/D-26: GlasswareManager is now a full-screen view (no Modal wrapper),
// reached from SettingsTab's "Glassware" menu item — these tests assert
// the shell conversion (back button wired to onBack, no role="dialog")
// while leaving Phase 2's add/rename/delete behavior untouched.
function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url === '/api/glassware' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [{ id: 'gw-1', name: 'Coupe' }],
      } as Response)
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderGlasswareManager(onBack = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <GlasswareManager onBack={onBack} />
    </QueryClientProvider>,
  )
  return { onBack }
}

describe('GlasswareManager', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders no role="dialog" element (Modal wrapper is gone)', () => {
    stubFetch()
    renderGlasswareManager()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders a "Back" button that calls onBack when clicked', () => {
    stubFetch()
    const { onBack } = renderGlasswareManager()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('still renders existing glassware and the add-glassware affordance', async () => {
    stubFetch()
    renderGlasswareManager()

    expect(await screen.findByText('Coupe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('New glassware name')).toBeInTheDocument()
    expect(screen.getByText('Add Glassware')).toBeInTheDocument()
  })
})
