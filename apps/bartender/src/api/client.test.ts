import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './client.js'

function stubFetchOk(body: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Regression test for the Bartender Orders "Done" button silently doing
  // nothing: Fastify's default JSON body-parser rejects any request that
  // declares `Content-Type: application/json` but sends an empty body
  // (FST_ERR_CTP_EMPTY_JSON_BODY, HTTP 400). useOpenOrder/useMarkOrderDone
  // call apiFetch with { method: 'PATCH' } and no body (these endpoints act
  // purely on the URL's :id param) — apiFetch must not lie about the
  // content-type when there is no content.
  it('omits the Content-Type header when no body is passed (e.g. a bodyless PATCH)', async () => {
    const fetchMock = stubFetchOk()

    await apiFetch('/orders/o1/done', { method: 'PATCH' })

    const [, requestInit] = fetchMock.mock.calls[0]
    const headers = new Headers(requestInit?.headers)
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('includes Content-Type: application/json when a body IS passed', async () => {
    const fetchMock = stubFetchOk()

    await apiFetch('/orders', { method: 'POST', body: JSON.stringify({ recipeId: 'r1' }) })

    const [, requestInit] = fetchMock.mock.calls[0]
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('still issues a plain GET with no body and no Content-Type header', async () => {
    const fetchMock = stubFetchOk([])

    await apiFetch('/orders')

    const [, requestInit] = fetchMock.mock.calls[0]
    const headers = new Headers(requestInit?.headers)
    expect(headers.has('Content-Type')).toBe(false)
  })
})
