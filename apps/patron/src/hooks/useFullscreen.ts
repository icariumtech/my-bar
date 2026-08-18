import { useEffect } from 'react'

// PATR-07: requests fullscreen exactly once, on mount, via
// document.documentElement.requestFullscreen() — an empty dependency
// array is what guarantees it never re-fires on re-render or on every
// user interaction (04-RESEARCH.md "Don't Hand-Roll": multiple call sites
// = multiple failure points; app-load mounting is the one place fullscreen
// succeeds consistently). A rejected/unsupported promise is caught here
// and only logged — fullscreen is an enhancement, not a hard requirement
// (T-04-15: the app must keep working even if the browser denies this).
export function useFullscreen(): void {
  useEffect(() => {
    async function requestFullscreen() {
      const elem = document.documentElement
      try {
        if (elem.requestFullscreen && !document.fullscreenElement) {
          await elem.requestFullscreen()
        }
      } catch (err) {
        console.warn('Fullscreen request failed (normal on locked devices):', err)
      }
    }

    requestFullscreen()
  }, [])
}
