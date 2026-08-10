import { useEffect, useRef, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Button } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import type { Ingredient } from '@my-bar/shared'

// D-08: 3s is the concrete reading of "brief (~few seconds)" — a named,
// tunable constant rather than a structural choice (01-RESEARCH.md
// Assumption A4). Confirm the feel with the owner during UAT.
const UNDO_GRACE_PERIOD_MS = 3000

interface IngredientRowProps {
  ingredient: Ingredient
  onCommitToggle: (id: string, nextInStock: boolean) => void
  onEdit?: (ingredient: Ingredient) => void
}

// The Barback screen's signature interaction (INV-03, D-08, D-10): swipe
// left marks a bottle out-of-stock, swipe right marks it in-stock, and the
// PATCH is DEFERRED behind an undo grace-period timer rather than fired
// immediately. Three shapes are explicitly ruled out and must never be
// built here, even as an interim step: a toggle switch, a whole-row tap
// target, or an immediate write with a compensating undo offered
// afterwards — see 01-RESEARCH.md "Anti-Patterns to Avoid".
export function IngredientRow({ ingredient, onCommitToggle, onEdit }: IngredientRowProps) {
  // The target stock state a swipe is currently pending toward, or null
  // when no toggle is in flight.
  const [pending, setPending] = useState<boolean | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Clear the pending timer on unmount so a row scrolled out of the list
  // mid-window cannot fire onCommitToggle against an unmounted component.
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  function startToggle(nextInStock: boolean) {
    // A mid-window re-swipe (e.g. left then right before the timer fires)
    // must not stack two pending commits — clear any existing timer first.
    clearTimeout(timerRef.current)
    setPending(nextInStock)
    timerRef.current = setTimeout(() => {
      onCommitToggle(ingredient.id, nextInStock)
      setPending(null)
    }, UNDO_GRACE_PERIOD_MS)
  }

  function undo() {
    // No network request is ever made for an undone swipe — clearing the
    // timer here is the entire safety net (D-10), not a compensating call.
    clearTimeout(timerRef.current)
    setPending(null)
  }

  const handlers = useSwipeable({
    onSwiping: (event) => {
      // Clamp the live drag so the reveal is a bounded peek, not a
      // full-width drag-follow.
      setSwipeOffset(Math.max(-80, Math.min(80, event.deltaX)))
    },
    onSwiped: () => setSwipeOffset(0),
    onSwipedLeft: () => startToggle(false), // D-08: left = out-of-stock
    onSwipedRight: () => startToggle(true), // D-08: right = in-stock
    trackMouse: true,
  })

  // The row flips instantly on swipe: pending (if any) wins over the
  // ingredient's last-known server value.
  const displayedInStock = pending ?? ingredient.inStock
  const revealColorClass = swipeOffset < 0 ? 'bg-bar-destructive' : 'bg-bar-accent'

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ minHeight: 48 }}>
      {/* The visual half of the gesture react-swipeable doesn't provide —
          a CSS-transform reveal behind the row as the swipe progresses. */}
      <div className={`absolute inset-0 rounded-lg ${revealColorClass}`} aria-hidden="true" />
      <div
        className={`relative flex items-center justify-between gap-md min-h-[48px] px-md rounded-lg bg-bar-surface transition-transform ${
          displayedInStock ? '' : 'opacity-60'
        }`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        {/* Swipe handlers live only on the name/category content, not on
            the edit button below — tapping Edit must never start a toggle. */}
        <div {...handlers} className="flex flex-col min-w-0 flex-1 py-sm">
          <span className="text-white text-base truncate">{ingredient.name}</span>
          <span className="text-zinc-400 text-sm truncate">{ingredient.categoryName}</span>
        </div>

        <div className="flex items-center gap-sm shrink-0">
          {pending !== null && (
            <Button onClick={undo} style={{ minHeight: 48, minWidth: 48 }}>
              Undo
            </Button>
          )}
          <span
            aria-label={displayedInStock ? 'in stock' : 'out of stock'}
            className={`inline-block w-3 h-3 rounded-full ${
              displayedInStock ? 'bg-bar-accent' : 'bg-bar-destructive'
            }`}
          />
          {onEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Edit"
              style={{ minHeight: 48, minWidth: 48 }}
              onClick={(event) => {
                event.stopPropagation()
                onEdit(ingredient)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
