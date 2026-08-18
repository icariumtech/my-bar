import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BottomTabBar } from './BottomTabBar.js'

describe('BottomTabBar', () => {
  it('renders two tabs in fixed left-to-right order: Recipes, Orders', () => {
    render(<BottomTabBar activeTab="recipes" onChange={vi.fn()} openOrderCount={0} />)

    const labels = screen.getAllByText(/^Recipes$|^Orders$/)
    expect(labels.map((el) => el.textContent)).toEqual(['Recipes', 'Orders'])
  })

  it('calls onChange("orders") exactly once when Orders is clicked while Recipes is active', () => {
    const onChange = vi.fn()
    render(<BottomTabBar activeTab="recipes" onChange={onChange} openOrderCount={0} />)

    fireEvent.click(screen.getByText('Orders'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('orders')
  })

  it('is a no-op when the already-active tab is clicked', () => {
    const onChange = vi.fn()
    render(<BottomTabBar activeTab="recipes" onChange={onChange} openOrderCount={0} />)

    fireEvent.click(screen.getByText('Recipes'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('marks only the active tab as aria-selected', () => {
    render(<BottomTabBar activeTab="orders" onChange={vi.fn()} openOrderCount={0} />)

    expect(screen.getByRole('tab', { name: /Orders/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Recipes/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows a badge with the open order count when it is greater than 0', () => {
    render(<BottomTabBar activeTab="recipes" onChange={vi.fn()} openOrderCount={3} />)

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows no badge (antd Badge showZero={false} default) when openOrderCount is 0', () => {
    render(<BottomTabBar activeTab="recipes" onChange={vi.fn()} openOrderCount={0} />)

    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
