import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement these browser APIs, and antd's Select/Modal
// internals reach for them — without stubs, tests either crash or spam
// noisy console errors that obscure real failures. Bartender uses antd
// exactly like Barback, so the same stubs are required here.

window.matchMedia =
  window.matchMedia ||
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error -- jsdom has no ResizeObserver; antd's Select needs one.
global.ResizeObserver = MockResizeObserver

Element.prototype.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}
