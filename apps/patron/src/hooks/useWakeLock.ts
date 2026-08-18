import { useEffect } from 'react'

// PATR-07/WR-02: requests a screen wake-lock on mount, via
// navigator.wakeLock.request('screen') — the `'wakeLock' in navigator`
// guard makes this a safe no-op on browsers without the API at all
// (04-RESEARCH.md Assumption A2/Pitfall 5). `.catch` (rather than an
// awaited try/catch) is enough here since there's no subsequent code that
// needs the resolved WakeLockSentinel — a denied/rejected request just
// logs a warning and the app continues functioning (T-04-15).
//
// WR-02: per the Screen Wake Lock API spec, the UA automatically releases
// an active WakeLockSentinel whenever document.visibilityState becomes
// 'hidden' (kiosk iPad screen locks/backgrounds — CLAUDE.md's own stated
// "kiosk iPads/phones sleep, lock, and hop wifi" operating condition) and
// does NOT automatically re-acquire it when the page becomes visible again
// — the app must listen for 'visibilitychange' and re-request itself, or
// the wake-lock feature silently stops working for the rest of the kiosk's
// uptime after the very first screen lock.
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | undefined

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch (err) {
        console.warn('Wake lock request failed:', err)
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      // Optional-chained through `release` itself (not just `sentinel`) so
      // a mocked/partial sentinel without a `release` method (as used in
      // this hook's own test suite) is a safe unmount no-op rather than a
      // thrown TypeError.
      void sentinel?.release?.()?.catch(() => {})
    }
  }, [])
}
