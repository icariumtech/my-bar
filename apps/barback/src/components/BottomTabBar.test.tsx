import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BottomTabBar } from './BottomTabBar.js'

describe('BottomTabBar', () => {
  it('renders three tabs in fixed left-to-right order: Ingredients, Recipes, Settings', () => {
    render(<BottomTabBar activeTab="ingredients" onChange={vi.fn()} />)

    const labels = screen.getAllByText(/Ingredients|Recipes|Settings/)
    expect(labels.map((el) => el.textContent)).toEqual(['Ingredients', 'Recipes', 'Settings'])
  })

  it('calls onChange("recipes") exactly once when Recipes is clicked while Ingredients is active', () => {
    const onChange = vi.fn()
    render(<BottomTabBar activeTab="ingredients" onChange={onChange} />)

    fireEvent.click(screen.getByText('Recipes'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('recipes')
  })

  it('is a no-op when the already-active tab is clicked (antd Segmented renders a native radio input, which does not emit a change event for a click that does not change its checked state — the adjacency no-op the parent relies on in task 2)', () => {
    const onChange = vi.fn()
    render(<BottomTabBar activeTab="ingredients" onChange={onChange} />)

    fireEvent.click(screen.getByText('Ingredients'))

    expect(onChange).not.toHaveBeenCalled()
  })
})
