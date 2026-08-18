import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWakeLock } from './useWakeLock.js'

// PATR-07: RED-phase tests — proves a screen wake-lock is requested
// exactly once on mount when the API exists, and that the app never
// throws on browsers without the API or on a rejected request. See
// 04-RESEARCH.md "Wake Lock (Screen Stay-On)" and Pitfall 5.
describe('useWakeLock', () => {
  const originalWakeLock = (navigator as { wakeLock?: unknown }).wakeLock

  afterEach(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: originalWakeLock,
      configurable: true,
      writable: true,
    })
    vi.restoreAllMocks()
  })

  it("calls navigator.wakeLock.request('screen') exactly once when the API exists", () => {
    const request = vi.fn().mockResolvedValue({})
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request },
      configurable: true,
      writable: true,
    })

    renderHook(() => useWakeLock())

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('screen')
  })

  it('does not throw when navigator.wakeLock is absent entirely', () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    delete (navigator as { wakeLock?: unknown }).wakeLock

    expect(() => renderHook(() => useWakeLock())).not.toThrow()
  })

  it('does not throw when the request rejects (logs a console warning only)', async () => {
    const request = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request },
      configurable: true,
      writable: true,
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => renderHook(() => useWakeLock())).not.toThrow()

    await Promise.resolve()
    await Promise.resolve()

    expect(warnSpy).toHaveBeenCalled()
  })
})
