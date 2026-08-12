import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MakeableIndicator } from './MakeableIndicator.js'

describe('MakeableIndicator', () => {
  it('renders "Available" for status="green"', () => {
    render(<MakeableIndicator status="green" />)
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('renders "Not Available" for status="yellow" — not "Substitution needed" or any yellow-specific wording (D-42)', () => {
    render(<MakeableIndicator status="yellow" />)
    expect(screen.getByText('Not Available')).toBeInTheDocument()
    expect(screen.queryByText(/substitution/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/alternative/i)).not.toBeInTheDocument()
  })

  it('renders "Not Available" for status="red"', () => {
    render(<MakeableIndicator status="red" />)
    expect(screen.getByText('Not Available')).toBeInTheDocument()
  })
})
