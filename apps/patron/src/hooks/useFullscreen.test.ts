import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFullscreen } from './useFullscreen.js'

// PATR-07: RED-phase tests — proves fullscreen is requested exactly once
// on mount (never re-requested on re-render) and that a rejected/
// unsupported requestFullscreen() promise is caught and logged, never
// thrown to the app's error boundary or left as an unhandled rejection.
// See 04-RESEARCH.md "Fullscreen Mode (iPad Safari)" and Pitfall 1.
describe('useFullscreen', () => {
  const originalRequestFullscreen = document.documentElement.requestFullscreen

  afterEach(() => {
    document.documentElement.requestFullscreen = originalRequestFullscreen
    vi.restoreAllMocks()
  })

  it('calls document.documentElement.requestFullscreen() exactly once on mount, not again on re-render', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = requestFullscreen

    const { rerender } = renderHook(() => useFullscreen())
    rerender()
    rerender()

    expect(requestFullscreen).toHaveBeenCalledTimes(1)
  })

  it('catches a rejected requestFullscreen() promise and logs a warning instead of throwing', async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'))
    document.documentElement.requestFullscreen = requestFullscreen
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => renderHook(() => useFullscreen())).not.toThrow()

    // Flush the rejected promise's microtask queue.
    await Promise.resolve()
    await Promise.resolve()

    expect(warnSpy).toHaveBeenCalled()
  })
})
