import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'

// D-31/D-32: verifies the three tri-state copywriting-contract strings
// (02.1-UI-SPEC.md) each render for their corresponding status prop.
describe('MakeableStatusBadge', () => {
  it('renders "Ready to make" for green status', () => {
    render(<MakeableStatusBadge status="green" />)

    expect(screen.getByText('Ready to make')).toBeInTheDocument()
  })

  it('renders "Substitution needed" for yellow status', () => {
    render(<MakeableStatusBadge status="yellow" />)

    expect(screen.getByText('Substitution needed')).toBeInTheDocument()
  })

  it('renders "Missing ingredients" for red status', () => {
    render(<MakeableStatusBadge status="red" />)

    expect(screen.getByText('Missing ingredients')).toBeInTheDocument()
  })
})
