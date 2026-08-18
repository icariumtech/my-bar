import { RecipeBrowse } from './components/RecipeBrowse.js'
import { useFullscreen } from './hooks/useFullscreen.js'
import { useWakeLock } from './hooks/useWakeLock.js'

// Thin shell (mirrors apps/barback/src/App.tsx's own thin-shell
// precedent, D-23/D-26): all data-fetching, loading/error/empty states,
// and grid/rail composition now live in RecipeBrowse — this file has no
// other responsibility. Plan 03-02 replaced 03-01's inline tracer body
// wholesale. PATR-07 (04-05): fullscreen + wake-lock fire once at the
// app's single mount here, independent of which child view is currently
// rendered.
export default function App() {
  useFullscreen()
  useWakeLock()

  return <RecipeBrowse />
}
