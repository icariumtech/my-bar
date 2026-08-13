import '@testing-library/jest-dom/vitest'

// Patron has no antd dependency in this phase's plans (TagRail/TagSubmenu/
// RecipeDetail are all plain conditional renders, not antd Select/Modal
// internals), so the matchMedia/ResizeObserver/scrollTo polyfills
// apps/barback/src/test/setup.ts needs for antd are not required here — do
// not copy them speculatively.
