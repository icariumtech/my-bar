import { describe, expect, it } from 'vitest'
import { buildApp } from './index.js'

describe('GET /health', () => {
  it('returns 200 with status ok and a timestamp string', async () => {
    const app = buildApp()

    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ status: 'ok' })
    expect(typeof body.timestamp).toBe('string')
  })
})
