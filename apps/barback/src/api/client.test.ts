import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './client.js'

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('surfaces the server real error message from a structured error body (G-02-6)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Recipe name is required' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/recipes', { method: 'POST' })).rejects.toThrow(
      'Recipe name is required',
    )
  })

  it('falls back to the generic message when the error body is not parseable JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('not json')
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/recipes', { method: 'POST' })).rejects.toThrow(
      'Request to /recipes failed: 500 Internal Server Error',
    )
  })
})
