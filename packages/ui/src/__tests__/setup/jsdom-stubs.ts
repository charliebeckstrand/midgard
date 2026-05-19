import { vi } from 'vitest'

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
	window.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof window.ResizeObserver
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
	Element.prototype.scrollIntoView = vi.fn()
}

// jsdom has no canvas backend and prints a "Not implemented" jsdomError every
// time getContext is called. PdfViewer and SignaturePad already null-check the
// returned context, so returning null directly is behaviourally identical —
// minus the noise.
HTMLCanvasElement.prototype.getContext = (() => null) as HTMLCanvasElement['getContext']
