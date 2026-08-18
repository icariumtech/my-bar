import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'

// D-63: unlike Patron's 2-state collapse, all three tri-state strings must
// be reachable here — the bartender is the one making the substitution
// judgment call. Copy matches Barback's own MakeableStatusBadge exactly.
describe('MakeableStatusBadge', () => {
  it('renders "Ready to make" for status="green"', () => {
    render(<MakeableStatusBadge status="green" />)
    expect(screen.getByText('Ready to make')).toBeInTheDocument()
  })

  it('renders "Substitution needed" for status="yellow"', () => {
    render(<MakeableStatusBadge status="yellow" />)
    expect(screen.getByText('Substitution needed')).toBeInTheDocument()
  })

  it('renders "Missing ingredients" for status="red"', () => {
    render(<MakeableStatusBadge status="red" />)
    expect(screen.getByText('Missing ingredients')).toBeInTheDocument()
  })
})
