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
    // 260813-ea3 neon-glow restyle: rounded-full glow-hued pill; shrink-0
    // keeps the badge from being squeezed by RecipeCard's flex header row.
    // Text content and isAvailable boolean are unchanged.
    <div
      className={`inline-block px-md py-xs rounded-full font-semibold text-sm uppercase tracking-wide shrink-0 ${
        isAvailable
          ? 'bg-patron-success text-patron-bg glow-success'
          : 'bg-patron-destructive text-white glow-destructive'
      }`}
    >
      {isAvailable ? 'Available' : 'Not Available'}
    </div>
  )
}
