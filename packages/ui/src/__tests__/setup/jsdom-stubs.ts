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

// jsdom implements neither Window's focus() nor print(): each logs a "Not
// implemented" jsdomError on call. The print paths (grid HTML export's
// `printRows`, the PDF viewer's `printPdf`) call both on a print iframe's
// `contentWindow` — a distinct Window from the main one, with its own
// own-property `focus`/`print`, so stubbing here alone can't reach it. Neutralize
// them on the main window for any direct call, and wrap the iframe
// `contentWindow` getter to neutralize each real print iframe's window once (a
// WeakSet keeps the getter idempotent; tests that swap in a mock `contentWindow`
// shadow the getter on the instance and are untouched).
for (const method of ['focus', 'print'] as const) {
	Object.defineProperty(window, method, { writable: true, configurable: true, value: vi.fn() })
}

const contentWindowDescriptor = Object.getOwnPropertyDescriptor(
	HTMLIFrameElement.prototype,
	'contentWindow',
)

if (contentWindowDescriptor?.get) {
	const nativeContentWindow = contentWindowDescriptor.get
	const stubbed = new WeakSet<WindowProxy>()

	Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
		...contentWindowDescriptor,
		get(this: HTMLIFrameElement) {
			const win = nativeContentWindow.call(this) as WindowProxy | null

			if (win && !stubbed.has(win)) {
				stubbed.add(win)

				win.focus = vi.fn()
				win.print = vi.fn()
			}

			return win
		},
	})
}

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
