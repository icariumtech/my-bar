import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { SettingsTab } from './SettingsTab.js'

// SettingsTab always mounts CategoryManager/GlasswareManager (Modal-based
// at this stage, per 02.1-02-PLAN.md), so their useCategories()/
// useGlassware() queries fire on render regardless of which menu item is
// open — stub both endpoints so the component tree doesn't error.
function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (url === '/api/categories' && method === 'GET') {
      return Promise.resolve({ ok: true, status: 200, json: async () => [] } as Response)
    }
    if (url === '/api/glassware' && method === 'GET') {
      return Promise.resolve({ ok: true, status: 200, json: async () => [] } as Response)
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderSettingsTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsTab />
    </QueryClientProvider>,
  )
}

describe('SettingsTab', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders both Categories and Glassware menu items', () => {
    stubFetch()
    renderSettingsTab()

    expect(screen.getByText('Categories')).toBeInTheDocument()
    expect(screen.getByText('Glassware')).toBeInTheDocument()
  })
})
