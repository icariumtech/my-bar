import { useEffect } from 'react'

// PATR-07: requests a screen wake-lock exactly once, on mount, via
// navigator.wakeLock.request('screen') — the `'wakeLock' in navigator`
// guard makes this a safe no-op on browsers without the API at all
// (04-RESEARCH.md Assumption A2/Pitfall 5). `.catch` (rather than an
// awaited try/catch) is enough here since there's no subsequent code that
// needs the resolved WakeLockSentinel — a denied/rejected request just
// logs a warning and the app continues functioning (T-04-15).
export function useWakeLock(): void {
  useEffect(() => {
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .catch((err: unknown) => console.warn('Wake lock request failed:', err))
    }
  }, [])
}
