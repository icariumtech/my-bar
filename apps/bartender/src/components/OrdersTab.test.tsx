import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Order } from '@my-bar/shared'
import { OrdersTab, formatElapsed } from './OrdersTab.js'
import { useOrders } from '../api/useOrders.js'

vi.mock('../api/useOrders.js', () => ({
  useOrders: vi.fn(),
}))

const mockedUseOrders = vi.mocked(useOrders)

const BASE_RECIPE = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Old Fashioned',
  ingredients: [],
  method: ['Stir'],
  glasswareId: null,
  glasswareName: null,
  garnish: null,
  description: null,
  tags: [],
  overallStatus: 'green' as const,
  missingCategoryIds: [],
  missingCategoryNames: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const BASE_ORDER: Order = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  recipe: BASE_RECIPE,
  patronName: 'Alice',
  status: 'new',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  elapsedSeconds: 90,
}

function stub(overrides: Partial<ReturnType<typeof useOrders>>) {
  mockedUseOrders.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('formatElapsed', () => {
  it('formats 0 seconds', () => {
    expect(formatElapsed(0)).toBe('0s ago')
  })

  it('formats 59 seconds', () => {
    expect(formatElapsed(59)).toBe('59s ago')
  })

  it('formats exactly 60 seconds as 1m ago, not 60s ago', () => {
    expect(formatElapsed(60)).toBe('1m ago')
  })

  it('formats 3599 seconds', () => {
    expect(formatElapsed(3599)).toBe('59m ago')
  })

  it('formats exactly 3600 seconds as 1h ago', () => {
    expect(formatElapsed(3600)).toBe('1h ago')
  })
})

describe('OrdersTab', () => {
  it('renders "No orders yet" / "Queue is empty..." when there are zero open orders', () => {
    stub({ data: [] })
    render(<OrdersTab />)

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByText('Queue is empty. Waiting for guests to order...')).toBeInTheDocument()
  })

  it('renders a loading indicator while isLoading', () => {
    stub({ isLoading: true })
    render(<OrdersTab />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders an error message and a working Retry button when isError', () => {
    const refetch = vi.fn()
    stub({ isError: true, refetch })
    render(<OrdersTab />)

    expect(screen.getByText('Failed to load orders. Check your connection.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it("renders each order's recipe name, patronName, and formatted elapsed time", () => {
    stub({ data: [BASE_ORDER] })
    render(<OrdersTab />)

    expect(screen.getByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.getByText('For: Alice')).toBeInTheDocument()
    expect(screen.getByText('1m ago')).toBeInTheDocument()
  })
})
