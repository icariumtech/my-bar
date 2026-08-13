import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// App.tsx is now a thin shell (mirrors apps/barback/src/App.tsx) — its
// only job is mounting RecipeBrowse. Mocking RecipeBrowse keeps this test
// decoupled from data-fetching/network concerns, which belong to
// RecipeBrowse.test.tsx.
vi.mock('./components/RecipeBrowse.js', () => ({
  RecipeBrowse: () => <div data-testid="recipe-browse-stub">stub</div>,
}))

describe('App', () => {
  it('renders RecipeBrowse as its entire body', async () => {
    const { default: App } = await import('./App.js')
    render(<App />)

    expect(screen.getByTestId('recipe-browse-stub')).toBeInTheDocument()
  })
})
