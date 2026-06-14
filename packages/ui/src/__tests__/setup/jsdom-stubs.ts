import { vi } from 'vitest'
import { stubWindowScrollBy } from '../helpers/stub-window-scroll'

/** Browser API stubs jsdom doesn't ship. Imported for side effects from setup.ts. */

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
		observe(_target: Element, _options?: ResizeObserverOptions): void {}
		unobserve(_target: Element): void {}
		disconnect(): void {}
	}

	window.ResizeObserver = StubResizeObserver
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
	Element.prototype.scrollIntoView = vi.fn()
}

// jsdom defines window.scrollBy but logs a "Not implemented" jsdomError on every
// call; the scroll-area scrollbar track falls back to it. The shared helper
// neutralises it here and stays importable for tests that want the spy.
stubWindowScrollBy()

// jsdom has no canvas backend; getContext prints a "Not implemented" jsdomError
// on every call. Returns null instead; components null-check the context.
HTMLCanvasElement.prototype.getContext = (() => null) as HTMLCanvasElement['getContext']
