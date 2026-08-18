import type { TriStateStatus } from '@my-bar/shared'

interface MakeableStatusBadgeProps {
  status: TriStateStatus
}

// Placeholder — Task 2 of this plan (04-02) replaces this with the full
// tri-state implementation (D-63, green/yellow/red all reachable). Exists
// here only so Task 1's RecipesTab.tsx can import a real file on disk;
// this Vite/Vitest setup requires vi.mock targets to physically resolve
// (verified empirically), so a stub is required before Task 2 runs.
export function MakeableStatusBadge({ status }: MakeableStatusBadgeProps) {
  return <span>{status}</span>
}
