import { RecipeBrowse } from './components/RecipeBrowse.js'

// Thin shell (mirrors apps/barback/src/App.tsx's own thin-shell
// precedent, D-23/D-26): all data-fetching, loading/error/empty states,
// and grid/rail composition now live in RecipeBrowse — this file has no
// other responsibility. Plan 03-02 replaced 03-01's inline tracer body
// wholesale.
export default function App() {
  return <RecipeBrowse />
}
