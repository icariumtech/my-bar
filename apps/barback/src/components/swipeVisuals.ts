// Pure, side-effect-free reveal-color and out-of-stock-surface class
// derivation for IngredientRow's swipe interaction (G-01-5, G-01-5b gap
// closure). Kept separate from the gesture/timer wiring in IngredientRow.tsx
// so the swipeOffset===0-at-rest regression (G-01-5: the reveal layer must
// never resolve to the reserved in-stock accent green) is covered by a
// fast, isolated unit test rather than only being exercised end-to-end.

const REVEAL_NEUTRAL_CLASS = 'bg-transparent'
const REVEAL_DESTRUCTIVE_CLASS = 'bg-bar-destructive'
const REVEAL_ACCENT_CLASS = 'bg-bar-accent'

const SURFACE_IN_STOCK_BACKGROUND = 'bg-bar-surface'
const SURFACE_IN_STOCK_NAME_TEXT = 'text-white'
const SURFACE_OUT_OF_STOCK_BACKGROUND = 'bg-zinc-950'
const SURFACE_OUT_OF_STOCK_NAME_TEXT = 'text-zinc-500'

// D-08: negative swipeOffset (left) is always out-of-stock/destructive,
// positive swipeOffset (right) is always in-stock/accent. At rest
// (swipeOffset === 0) the reveal layer must never resolve to a color — this
// is the exact G-01-5 regression case, where the previous ternary's false
// branch defaulted the always-rendered reveal div to the reserved
// in-stock accent green.
export function getRevealColorClass(swipeOffset: number): string {
  if (swipeOffset === 0) return REVEAL_NEUTRAL_CLASS
  return swipeOffset < 0 ? REVEAL_DESTRUCTIVE_CLASS : REVEAL_ACCENT_CLASS
}

// G-01-5: out-of-stock rows must be greyed via their own independent
// surface treatment (a distinct solid background plus a dimmed name-text
// color), never via opacity layered over whatever color the reveal layer
// underneath happens to be showing.
export function getRowSurfaceClasses(displayedInStock: boolean): {
  background: string
  nameText: string
} {
  if (displayedInStock) {
    return { background: SURFACE_IN_STOCK_BACKGROUND, nameText: SURFACE_IN_STOCK_NAME_TEXT }
  }
  return { background: SURFACE_OUT_OF_STOCK_BACKGROUND, nameText: SURFACE_OUT_OF_STOCK_NAME_TEXT }
}
