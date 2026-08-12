import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Form } from 'antd'
import type { FormInstance } from 'antd'
import type { Category, Ingredient } from '@my-bar/shared'
import { IngredientListForm } from './IngredientListForm.js'

// D-28/MATCH-05: exercises IngredientListForm's wiring of the combined
// IngredientPicker into each recipe ingredient row via a Form.Item
// noStyle/shouldUpdate render-prop reading/writing the row's
// categoryId/ingredientId/requiresSpecific through the surrounding form
// instance. Follows IngredientPicker.test.tsx's antd interaction pattern
// (mousedown to open, click the rendered option by title).

const fixtureCategory: Category = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Rum',
}

const fixtureIngredient: Ingredient = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Havana Club',
  categoryId: fixtureCategory.id,
  categoryName: fixtureCategory.name,
  note: null,
  inStock: true,
}

function stubFetch() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url === '/api/categories' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [fixtureCategory],
      } as Response)
    }

    if (url === '/api/ingredients' && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [fixtureIngredient],
      } as Response)
    }

    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderInForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let formInstance: FormInstance | undefined

  function Wrapper() {
    const [form] = Form.useForm()
    formInstance = form
    return (
      <Form form={form}>
        <IngredientListForm />
      </Form>
    )
  }

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <Wrapper />
    </QueryClientProvider>,
  )

  return {
    ...utils,
    getForm: () => {
      if (!formInstance) throw new Error('form instance not set')
      return formInstance
    },
  }
}

function openFirstPicker() {
  const combobox = screen.getAllByRole('combobox')[0]
  fireEvent.mouseDown(combobox)
  return combobox
}

describe('IngredientListForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('a newly-added ingredient row defaults to ingredientId: null, requiresSpecific: false', async () => {
    stubFetch()
    const { getForm } = renderInForm()

    fireEvent.click(screen.getByRole('button', { name: /Add Ingredient/ }))

    const row = getForm().getFieldValue(['ingredients', 0])
    expect(row.ingredientId).toBeNull()
    expect(row.requiresSpecific).toBe(false)
  })

  it("selecting a category in the row's picker sets categoryId and leaves ingredientId/requiresSpecific at category-only defaults", async () => {
    stubFetch()
    const { getForm } = renderInForm()

    fireEvent.click(screen.getByRole('button', { name: /Add Ingredient/ }))
    await screen.findAllByRole('combobox')

    openFirstPicker()
    fireEvent.click(await screen.findByTitle('Rum'))

    const row = getForm().getFieldValue(['ingredients', 0])
    expect(row.categoryId).toBe(fixtureCategory.id)
    expect(row.ingredientId).toBeNull()
    expect(row.requiresSpecific).toBe(false)
    expect(screen.queryByText('Must be this specific ingredient')).not.toBeInTheDocument()
  })

  it("selecting a specific ingredient in the row's picker sets categoryId/ingredientId/requiresSpecific together, and the lock checkbox renders for that row", async () => {
    stubFetch()
    const { getForm } = renderInForm()

    fireEvent.click(screen.getByRole('button', { name: /Add Ingredient/ }))
    await screen.findAllByRole('combobox')

    openFirstPicker()
    fireEvent.click(await screen.findByTitle('Havana Club (Rum)'))

    const row = getForm().getFieldValue(['ingredients', 0])
    expect(row.categoryId).toBe(fixtureCategory.id)
    expect(row.ingredientId).toBe(fixtureIngredient.id)
    expect(row.requiresSpecific).toBe(true)

    expect(
      await screen.findByRole('checkbox', { name: 'Must be this specific ingredient' }),
    ).toBeChecked()
  })
})
