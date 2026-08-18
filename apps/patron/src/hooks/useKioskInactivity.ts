import { useEffect, useRef } from 'react'

// PATR-08: kiosk idle-detection hook. Resets a 90000ms (90s — the middle
// of 04-UI-SPEC.md Appendix's recommended 60-120s range, per
// 04-RESEARCH.md Assumption A10) timer on any touchstart/mousedown/keydown
// activity on `window`, and fires `onTimeout` once per genuinely idle
// window. Deliberately fires again on every subsequent idle window with no
// intervening activity — the hook has no way to know whether the app is
// already back at the browse/home view, so RecipeBrowse's own state update
// (closing any open detail view) is what makes a second firing a no-op in
// practice. Centralizes listener add/remove and timer cleanup in one place
// (04-RESEARCH.md "Don't Hand-Roll": scattered listeners leak memory and
// race against unmount).
export function useKioskInactivity(onTimeout: () => void, timeoutMs: number = 90000): void {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      // Chains into another resetTimer() after firing, rather than a
      // one-shot setTimeout — the hook has no way to know whether the app
      // is already back at the browse/home view, so it keeps firing once
      // per subsequent idle window until the next real activity event
      // resets it (see file-level comment above).
      timerRef.current = setTimeout(() => {
        onTimeout()
        resetTimer()
      }, timeoutMs)
    }

    // Start the initial idle window immediately on mount.
    resetTimer()

    window.addEventListener('touchstart', resetTimer)
    window.addEventListener('mousedown', resetTimer)
    window.addEventListener('keydown', resetTimer)

    return () => {
      window.removeEventListener('touchstart', resetTimer)
      window.removeEventListener('mousedown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onTimeout, timeoutMs])
}
