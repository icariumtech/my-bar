import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FullScreenHeader } from './FullScreenHeader.js'

// (260812-m0i) Covers the shared full-screen header: title render, the
// circular icon-only 48x48 back button (accessible name from aria-label,
// no visible text), click-calls-onBack, and the optional titleStyle
// override RecipeDetailView relies on to keep its Display-role typography.
describe('FullScreenHeader', () => {
  it('renders the title text', () => {
    render(<FullScreenHeader onBack={vi.fn()} title="Edit Ingredient" />)

    expect(screen.getByText('Edit Ingredient')).toBeInTheDocument()
  })

  it('renders a circular accent back button with no visible text', () => {
    render(<FullScreenHeader onBack={vi.fn()} title="Edit Ingredient" />)

    const backButton = screen.getByRole('button', { name: 'Back' })
    expect(backButton).toBeInTheDocument()
    expect(backButton.textContent?.trim()).toBe('')
    expect(backButton).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn()
    render(<FullScreenHeader onBack={onBack} title="Edit Ingredient" />)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('applies an optional titleStyle override, e.g. Display-role typography for RecipeDetailView', () => {
    render(
      <FullScreenHeader
        onBack={vi.fn()}
        title="Daiquiri"
        titleStyle={{ fontSize: 28, fontWeight: 600 }}
      />,
    )

    expect(screen.getByText('Daiquiri')).toHaveStyle({ fontSize: '28px', fontWeight: '600' })
  })
})
