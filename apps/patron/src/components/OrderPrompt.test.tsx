import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OrderPrompt } from './OrderPrompt.js'

describe('OrderPrompt', () => {
  it('renders the "Who\'s this for?" heading and the guest-name input', () => {
    render(<OrderPrompt onSubmit={() => {}} onCancel={() => {}} isSubmitting={false} />)

    expect(screen.getByText("Who's this for?")).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Guest name (optional)')).toBeInTheDocument()
  })

  it('calls onSubmit with the typed name when Send Order is clicked', () => {
    const onSubmit = vi.fn()
    render(<OrderPrompt onSubmit={onSubmit} onCancel={() => {}} isSubmitting={false} />)

    fireEvent.change(screen.getByPlaceholderText('Guest name (optional)'), {
      target: { value: 'Bob' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send Order' }))

    expect(onSubmit).toHaveBeenCalledWith('Bob')
  })

  it('calls onSubmit with undefined when the field is left empty', () => {
    const onSubmit = vi.fn()
    render(<OrderPrompt onSubmit={onSubmit} onCancel={() => {}} isSubmitting={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send Order' }))

    expect(onSubmit).toHaveBeenCalledWith(undefined)
  })

  it('calls onCancel and never onSubmit when Cancel is clicked', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(<OrderPrompt onSubmit={onSubmit} onCancel={onCancel} isSubmitting={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables both buttons when isSubmitting is true', () => {
    render(<OrderPrompt onSubmit={() => {}} onCancel={() => {}} isSubmitting={true} />)

    expect(screen.getByRole('button', { name: 'Send Order' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
