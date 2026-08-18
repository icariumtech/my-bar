import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FullScreenScrollArea } from './FullScreenScrollArea.js'

describe('FullScreenScrollArea', () => {
  it('renders the title and calls onBack when the Back button is clicked', () => {
    const onBack = vi.fn()
    render(
      <FullScreenScrollArea onBack={onBack} title="Search & Filter">
        <div>content</div>
      </FullScreenScrollArea>,
    )

    expect(screen.getByText('Search & Filter')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders children reachably inside the scrollable content', () => {
    render(
      <FullScreenScrollArea onBack={vi.fn()} title="Title">
        <button>Apply</button>
      </FullScreenScrollArea>,
    )

    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })
})
