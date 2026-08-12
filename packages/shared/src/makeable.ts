import { z } from 'zod'

// D-31/D-32: tri-state vocabulary for per-line and recipe-level makeable
// status — single source of truth so the server and every frontend
// consumer (Barback, and later Patron/Bartender) share the exact same
// three string values instead of re-deriving them independently.
export const triStateStatus = z.enum(['green', 'yellow', 'red'])
export type TriStateStatus = z.infer<typeof triStateStatus>
