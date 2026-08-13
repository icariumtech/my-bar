import type { TriStateStatus } from '@my-bar/shared'

interface MakeableIndicatorProps {
  status: TriStateStatus
}

// D-42: Patron collapses Barback's tri-state (green/yellow/red) to
// 2-state — yellow counts as not-makeable from the patron's perspective
// (substitution judgment is the bartender's job). These two strings
// ("Available"/"Not Available") are the ONLY text this component ever
// renders — no icon, no third yellow-specific branch, unlike Barback's
// MakeableStatusBadge which deliberately DOES show a distinct yellow
// state for the owner/bartender audience.
export function MakeableIndicator({ status }: MakeableIndicatorProps) {
  const isAvailable = status === 'green'

  return (
    <div
      className={`inline-block px-md py-xs rounded font-semibold text-sm ${
        isAvailable ? 'bg-patron-success text-patron-bg' : 'bg-patron-destructive text-white'
      }`}
    >
      {isAvailable ? 'Available' : 'Not Available'}
    </div>
  )
}
