import { describe, expect, it } from 'vitest'
import { getRevealColorClass, getRowSurfaceClasses } from './swipeVisuals.js'

describe('getRevealColorClass', () => {
  it('returns a neutral, non-color class at rest (swipeOffset === 0) — G-01-5 regression', () => {
    const result = getRevealColorClass(0)
    expect(result).not.toBe('bg-bar-accent')
    expect(result).not.toBe('bg-bar-destructive')
  })

  it('returns the destructive-red class for any negative swipeOffset (D-08: left = out-of-stock)', () => {
    expect(getRevealColorClass(-1)).toBe('bg-bar-destructive')
    expect(getRevealColorClass(-80)).toBe('bg-bar-destructive')
  })

  it('returns the accent-green class for any positive swipeOffset (D-08: right = in-stock)', () => {
    expect(getRevealColorClass(1)).toBe('bg-bar-accent')
    expect(getRevealColorClass(80)).toBe('bg-bar-accent')
  })
})

describe('getRowSurfaceClasses', () => {
  it('returns the standard surface background and standard name-text color when in stock', () => {
    const result = getRowSurfaceClasses(true)
    expect(result.background).toBe('bg-bar-surface')
    expect(result.nameText).toBe('text-white')
  })

  it('returns an independent, non-translucent background and dimmed name-text when out of stock', () => {
    const result = getRowSurfaceClasses(false)
    expect(result.background).not.toBe('bg-bar-surface')
    expect(result.background).not.toMatch(/opacity|\/\d+/)
    expect(result.nameText).not.toBe('text-white')
  })
})
