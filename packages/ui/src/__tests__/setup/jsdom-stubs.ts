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

if (typeof window.IntersectionObserver !== 'function') {
	class StubIntersectionObserver implements IntersectionObserver {
		readonly root: Element | Document | null = null
		readonly rootMargin: string = '0px'
		readonly scrollMargin: string = '0px'
		readonly thresholds: ReadonlyArray<number> = [0]
		observe(_target: Element): void {}
		unobserve(_target: Element): void {}
		disconnect(): void {}
		takeRecords(): IntersectionObserverEntry[] {
			return []
		}
	}

	window.IntersectionObserver = StubIntersectionObserver
}

if (typeof Element.prototype.scrollIntoView !== 'function') {
	Element.prototype.scrollIntoView = vi.fn()
}

// jsdom defines window.scrollBy but logs a "Not implemented" jsdomError on every
// call; the scroll-area scrollbar track falls back to it. The shared helper
// neutralizes it here and stays importable for tests that want the spy.
stubWindowScrollBy()

// jsdom has no canvas backend; getContext prints a "Not implemented" jsdomError
// on every call. Returns null instead; components null-check the context.
HTMLCanvasElement.prototype.getContext = (() => null) as HTMLCanvasElement['getContext']

// jsdom implements neither URL.createObjectURL nor URL.revokeObjectURL; the
// blob-download paths (CSV/HTML export, PDF viewer) call them. Stub as no-ops so
// the properties exist and tests can wrap them with vi.spyOn (auto-restored by
// restoreMocks) — never a raw reassignment, which would leak across the shared
// vmThreads worker.
if (typeof URL.createObjectURL !== 'function') {
	URL.createObjectURL = vi.fn(() => 'blob:stub')
}

if (typeof URL.revokeObjectURL !== 'function') {
	URL.revokeObjectURL = vi.fn()
}
