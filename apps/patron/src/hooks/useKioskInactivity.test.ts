import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKioskInactivity } from './useKioskInactivity.js'

// PATR-08: RED-phase tests under fake timers — proves the hook resets its
// internal 90s window on real DOM activity events and fires its timeout
// callback exactly once per genuinely idle window, with no leaks on
// unmount. See 04-RESEARCH.md "Kiosk Inactivity Detection Hook" and
// Assumption A10 (90s is the concrete default, middle of the 60-120s
// range 04-UI-SPEC.md's Appendix recommends).
describe('useKioskInactivity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onTimeout exactly once after 90000ms of no activity', () => {
    const onTimeout = vi.fn()
    renderHook(() => useKioskInactivity(onTimeout, 90000))

    vi.advanceTimersByTime(90000)

    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('does not call onTimeout at 89999ms', () => {
    const onTimeout = vi.fn()
    renderHook(() => useKioskInactivity(onTimeout, 90000))

    vi.advanceTimersByTime(89999)

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it.each(['touchstart', 'mousedown', 'keydown'])(
    'resets the timer on a %s event, delaying onTimeout by a full 90000ms from the event',
    (eventType) => {
      const onTimeout = vi.fn()
      renderHook(() => useKioskInactivity(onTimeout, 90000))

      vi.advanceTimersByTime(80000)
      window.dispatchEvent(new Event(eventType))

      // Advance to the original 90000ms mark (10000ms more) — must NOT
      // have fired, since the event reset the window (the new window
      // fires 90000ms after the event, i.e. at the 170000ms mark).
      vi.advanceTimersByTime(10000)
      expect(onTimeout).not.toHaveBeenCalled()

      // Advance up to (but not including) 90000ms after the reset event
      // (79999ms more, cumulative 89999ms since the event).
      vi.advanceTimersByTime(79999)
      expect(onTimeout).not.toHaveBeenCalled()

      // The final 1ms crosses the full 90000ms-since-event mark.
      vi.advanceTimersByTime(1)
      expect(onTimeout).toHaveBeenCalledTimes(1)
    },
  )

  it('calls onTimeout again for each subsequent idle period with no intervening activity', () => {
    const onTimeout = vi.fn()
    renderHook(() => useKioskInactivity(onTimeout, 90000))

    vi.advanceTimersByTime(90000)
    expect(onTimeout).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(90000)
    expect(onTimeout).toHaveBeenCalledTimes(2)
  })

  it('clears the pending timer and never calls onTimeout after unmount', () => {
    const onTimeout = vi.fn()
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = renderHook(() => useKioskInactivity(onTimeout, 90000))

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()

    vi.advanceTimersByTime(200000)
    expect(onTimeout).not.toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })
})
