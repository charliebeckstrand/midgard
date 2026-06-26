import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Browser API gaps jsdom doesn't ship, touched by the ui components the chrome
// renders (Tooltip/Sheet measure, scroll into view, etc.).
if (typeof window.matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	})
}

if (typeof window.ResizeObserver !== 'function') {
	class StubResizeObserver implements ResizeObserver {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	}

	window.ResizeObserver = StubResizeObserver
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
	Element.prototype.scrollIntoView = vi.fn()
}

afterEach(() => {
	cleanup()
})
