import { vi } from 'vitest'
import { makeMediaQueryList } from '../helpers/stub-match-media'
import { stubWindowScrollBy } from '../helpers/stub-window-scroll'

/** Browser API stubs jsdom doesn't ship. Imported for side effects from setup.ts. */

if (typeof window.matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		configurable: true,
		value: vi.fn((query: string) => makeMediaQueryList(query, false)),
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

// Reports every observed target as intersecting, once, on observe.
//
// jsdom lays nothing out, so it cannot answer whether an element is on screen.
// A stub that stays silent answers "nothing is ever visible", which is the
// wrong default: a viewport gate defers work that is otherwise correct, so a
// silent observer hides content from every test that renders behind one. Same
// reasoning as `useInView`'s no-observer branch — when the environment cannot
// tell, show it. A suite that drives the intersection itself replaces this stub
// through `installControlledObserver` in `helpers/controlled-intersection.ts`.
if (typeof window.IntersectionObserver !== 'function') {
	class StubIntersectionObserver implements IntersectionObserver {
		readonly root: Element | Document | null = null
		readonly rootMargin: string = '0px'
		readonly scrollMargin: string = '0px'
		readonly thresholds: ReadonlyArray<number> = [0]

		private readonly callback: IntersectionObserverCallback

		constructor(callback: IntersectionObserverCallback) {
			this.callback = callback
		}

		observe(target: Element): void {
			this.callback(
				[{ target, isIntersecting: true } as IntersectionObserverEntry],
				this as IntersectionObserver,
			)
		}

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

// jsdom implements no pointer capture, so a drag handler that captures its
// pointer throws on the first press. The stub keeps the captured pointer ids of
// each element, so `hasPointerCapture` answers what the code set and released.
// A stub that always answers `true` hides every path that takes the capture.
//
// Plain functions, not `vi.fn()`. A case that needs a spy calls
// `vi.spyOn(el, 'setPointerCapture')`, and `restoreMocks` removes that spy. On a
// member that is already a mock, `vi.spyOn` returns that mock, which every
// element shares and nothing restores.
//
// A capture ends only on an explicit release. A browser also releases it after
// `pointerup` and `pointercancel`, and fires `lostpointercapture`. jsdom fires
// neither event, so the stub does not either.
if (typeof Element.prototype.setPointerCapture !== 'function') {
	const captured = new WeakMap<Element, Set<number>>()

	Element.prototype.setPointerCapture = function setPointerCapture(pointerId: number) {
		const ids = captured.get(this) ?? new Set<number>()

		ids.add(pointerId)

		captured.set(this, ids)
	}

	Element.prototype.releasePointerCapture = function releasePointerCapture(pointerId: number) {
		captured.get(this)?.delete(pointerId)
	}

	Element.prototype.hasPointerCapture = function hasPointerCapture(pointerId: number) {
		return captured.get(this)?.has(pointerId) ?? false
	}
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
// restoreMocks) — never a raw reassignment, which would leak across the
// worker's shared window.
if (typeof URL.createObjectURL !== 'function') {
	URL.createObjectURL = vi.fn(() => 'blob:stub')
}

if (typeof URL.revokeObjectURL !== 'function') {
	URL.revokeObjectURL = vi.fn()
}
