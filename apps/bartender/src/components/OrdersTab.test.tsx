import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Order, Recipe } from '@my-bar/shared'
import { OrdersTab, batchOrders, formatElapsed } from './OrdersTab.js'
import { useOrders } from '../api/useOrders.js'
import { useOpenOrder } from '../api/useOpenOrder.js'
import { useMarkOrderDone } from '../api/useMarkOrderDone.js'
import { RecipeOrOrderDetail } from './RecipeOrOrderDetail.js'

vi.mock('../api/useOrders.js', () => ({
  useOrders: vi.fn(),
}))

vi.mock('../api/useOpenOrder.js', () => ({
  useOpenOrder: vi.fn(),
}))

vi.mock('../api/useMarkOrderDone.js', () => ({
  useMarkOrderDone: vi.fn(),
}))

vi.mock('./RecipeOrOrderDetail.js', () => ({
  RecipeOrOrderDetail: vi.fn(() => null),
}))

const mockedUseOrders = vi.mocked(useOrders)
const mockedUseOpenOrder = vi.mocked(useOpenOrder)
const mockedUseMarkOrderDone = vi.mocked(useMarkOrderDone)
const mockedRecipeOrOrderDetail = vi.mocked(RecipeOrOrderDetail)

const BASE_RECIPE: Recipe = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Old Fashioned',
  ingredients: [],
  method: ['Stir'],
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

const OTHER_RECIPE: Recipe = {
  ...BASE_RECIPE,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Daiquiri',
}

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    recipe: BASE_RECIPE,
    patronName: null,
    status: 'new',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    elapsedSeconds: 90,
    ...overrides,
  }
}

const BASE_ORDER: Order = makeOrder({ patronName: 'Alice' })

function stubOrders(overrides: Partial<ReturnType<typeof useOrders>>) {
  mockedUseOrders.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

function stubOpenOrder(mutate = vi.fn()) {
  mockedUseOpenOrder.mockReturnValue({
    mutate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return mutate
}

function stubMarkOrderDone(mutate = vi.fn()) {
  mockedUseMarkOrderDone.mockReturnValue({
    mutate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return mutate
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

describe('batchOrders', () => {
  it('returns an empty array for an empty input', () => {
    expect(batchOrders([])).toEqual([])
  })

  it('groups identical-recipe identical-status orders into one batch with count/patronNames/max-elapsed/orderIds', () => {
    const orders = [
      makeOrder({ id: 'o1', patronName: 'Alice', elapsedSeconds: 10 }),
      makeOrder({ id: 'o2', patronName: 'Bob', elapsedSeconds: 300 }),
      makeOrder({ id: 'o3', patronName: null, elapsedSeconds: 45 }),
    ]

    const batches = batchOrders(orders)

    expect(batches).toHaveLength(1)
    expect(batches[0].count).toBe(3)
    expect(batches[0].patronNames).toEqual(['Alice', 'Bob'])
    expect(batches[0].elapsedSeconds).toBe(300)
    expect(batches[0].orderIds).toEqual(['o1', 'o2', 'o3'])
  })

  it('a single unbatched order renders as a count-of-1 batch', () => {
    const batches = batchOrders([makeOrder({ id: 'o1' })])
    expect(batches).toHaveLength(1)
    expect(batches[0].count).toBe(1)
  })

  it('never merges the same recipe across different statuses', () => {
    const orders = [
      makeOrder({ id: 'o1', status: 'new' }),
      makeOrder({ id: 'o2', status: 'in_progress' }),
    ]

    const batches = batchOrders(orders)

    expect(batches).toHaveLength(2)
    expect(batches.every((b) => b.count === 1)).toBe(true)
  })

  it('sorts batches by elapsedSeconds descending across different recipes', () => {
    const orders = [
      makeOrder({ id: 'o1', recipe: BASE_RECIPE, elapsedSeconds: 10 }),
      makeOrder({ id: 'o2', recipe: OTHER_RECIPE, elapsedSeconds: 500 }),
    ]

    const batches = batchOrders(orders)

    expect(batches[0].recipe.id).toBe(OTHER_RECIPE.id)
    expect(batches[1].recipe.id).toBe(BASE_RECIPE.id)
  })
})

describe('OrdersTab', () => {
  it('renders "No orders yet" / "Queue is empty..." when there are zero open orders', () => {
    stubOrders({ data: [] })
    stubOpenOrder()
    stubMarkOrderDone()
    render(<OrdersTab />)

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByText('Queue is empty. Waiting for guests to order...')).toBeInTheDocument()
  })

  it('renders a loading indicator while isLoading', () => {
    stubOrders({ isLoading: true })
    stubOpenOrder()
    stubMarkOrderDone()
    render(<OrdersTab />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders an error message and a working Retry button when isError', () => {
    const refetch = vi.fn()
    stubOrders({ isError: true, refetch })
    stubOpenOrder()
    stubMarkOrderDone()
    render(<OrdersTab />)

    expect(screen.getByText('Failed to load orders. Check your connection.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it("renders each batch's recipe name, patronName, and formatted elapsed time", () => {
    stubOrders({ data: [BASE_ORDER] })
    stubOpenOrder()
    stubMarkOrderDone()
    render(<OrdersTab />)

    expect(screen.getByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.getByText('For: Alice')).toBeInTheDocument()
    expect(screen.getByText('1m ago')).toBeInTheDocument()
  })

  it('renders a "×N" suffix only when a batch has count > 1', () => {
    stubOrders({
      data: [
        makeOrder({ id: 'o1', patronName: 'Alice' }),
        makeOrder({ id: 'o2', patronName: 'Bob' }),
        makeOrder({ id: 'o3', patronName: null }),
      ],
    })
    stubOpenOrder()
    stubMarkOrderDone()
    render(<OrdersTab />)

    expect(screen.getByText('Old Fashioned ×3')).toBeInTheDocument()
  })

  it('renders no "×N" suffix for a count-of-1 batch', () => {
    stubOrders({ data: [BASE_ORDER] })
    stubOpenOrder()
    stubMarkOrderDone()
    render(<OrdersTab />)

    expect(screen.getByText('Old Fashioned')).toBeInTheDocument()
    expect(screen.queryByText(/×/)).not.toBeInTheDocument()
  })

  it("tapping a 'new'-status batch row auto-advances every order in it, then renders RecipeOrOrderDetail", () => {
    const mutate = stubOpenOrder()
    stubMarkOrderDone()
    stubOrders({
      data: [
        makeOrder({ id: 'o1', status: 'new', patronName: 'Alice' }),
        makeOrder({ id: 'o2', status: 'new', patronName: 'Bob' }),
      ],
    })
    render(<OrdersTab />)

    fireEvent.click(screen.getByText('Old Fashioned ×2'))

    expect(mutate).toHaveBeenCalledTimes(2)
    expect(mutate).toHaveBeenCalledWith('o1')
    expect(mutate).toHaveBeenCalledWith('o2')

    expect(mockedRecipeOrOrderDetail).toHaveBeenCalled()
    const props = mockedRecipeOrOrderDetail.mock.calls.at(-1)?.[0]
    expect(props?.recipe).toEqual(BASE_RECIPE)
    expect(props?.order).toMatchObject({ status: 'new' })
  })

  it("tapping an 'in_progress'-status batch row does NOT call useOpenOrder's mutate, but still renders RecipeOrOrderDetail", () => {
    const mutate = stubOpenOrder()
    stubMarkOrderDone()
    stubOrders({
      data: [makeOrder({ id: 'o1', status: 'in_progress', patronName: 'Alice' })],
    })
    render(<OrdersTab />)

    fireEvent.click(screen.getByText('Old Fashioned'))

    expect(mutate).not.toHaveBeenCalled()
    expect(mockedRecipeOrOrderDetail).toHaveBeenCalled()
  })

  it('opening a batch of 3 orders and invoking onMarkDone calls useMarkOrderDone.mutate once per orderId in that batch', () => {
    stubOpenOrder()
    const markDoneMutate = stubMarkOrderDone()
    stubOrders({
      data: [
        makeOrder({ id: 'o1', status: 'in_progress', patronName: 'Alice' }),
        makeOrder({ id: 'o2', status: 'in_progress', patronName: 'Bob' }),
        makeOrder({ id: 'o3', status: 'in_progress', patronName: null }),
      ],
    })
    render(<OrdersTab />)

    fireEvent.click(screen.getByText('Old Fashioned ×3'))

    const props = mockedRecipeOrOrderDetail.mock.calls.at(-1)?.[0]
    props?.onMarkDone?.()

    expect(markDoneMutate).toHaveBeenCalledTimes(3)
    expect(markDoneMutate).toHaveBeenCalledWith('o1')
    expect(markDoneMutate).toHaveBeenCalledWith('o2')
    expect(markDoneMutate).toHaveBeenCalledWith('o3')
  })
})
