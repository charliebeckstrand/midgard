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

// Node 25 puts `localStorage` and `sessionStorage` on `globalThis` before the
// jsdom environment fills it. jsdom does not replace a key that is already
// there, so its store never lands. Without a `--localstorage-file` path, Node's
// `localStorage` has no `Storage` method at all. A store over a `Map` replaces
// each global that cannot `setItem`, and leaves a working store alone, as on
// Node 24 and in the VM pools. The global stays an accessor, as Node's is.
class MemoryStorage implements Storage {
	private readonly entries = new Map<string, string>()

	get length(): number {
		return this.entries.size
	}

	key(index: number): string | null {
		return [...this.entries.keys()][index] ?? null
	}

	getItem(key: string): string | null {
		return this.entries.get(String(key)) ?? null
	}

	setItem(key: string, value: string): void {
		this.entries.set(String(key), String(value))
	}

	removeItem(key: string): void {
		this.entries.delete(String(key))
	}

	clear(): void {
		this.entries.clear()
	}
}

for (const kind of ['localStorage', 'sessionStorage'] as const) {
	let works = false

	try {
		works = typeof globalThis[kind]?.setItem === 'function'
	} catch {
		// A store that throws on access is a store to replace.
	}

	if (!works) {
		const storage = new MemoryStorage()

		Object.defineProperty(globalThis, kind, { configurable: true, get: () => storage })
	}
}

// A plain function, not `vi.fn()`, for the reason that the pointer-capture
// block below gives.
if (typeof Element.prototype.scrollIntoView !== 'function') {
	Element.prototype.scrollIntoView = () => {}
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
// blob-download paths (CSV/HTML export, PDF viewer) call them. Stub them as
// plain functions, so that the properties exist and a test can wrap them with
// `vi.spyOn`. `restoreMocks` then restores the spy. On a member that is already
// a mock, `vi.spyOn` returns that mock, and nothing restores the value that a
// case gives it. Never assign the members in a test, because the assignment
// stays on the shared window of the worker.
if (typeof URL.createObjectURL !== 'function') {
	URL.createObjectURL = () => 'blob:stub'
}

if (typeof URL.revokeObjectURL !== 'function') {
	URL.revokeObjectURL = () => {}
}

// jsdom runs each frame callback from one `setInterval`. It starts the interval
// when the count of pending callbacks goes up from zero, and it stops the
// interval when the count goes back to zero. It reads the global `setInterval`
// when it starts the interval. A fake clock replaces that global, but not
// `window.requestAnimationFrame`. Thus a frame that code requests through the
// window under a fake clock starts the interval on the fake clock. Motion and
// virtual-core request their frames through the window. `useRealTimers` then
// removes the interval, but the count stays above zero, so jsdom never starts a
// new interval. No frame runs again on the shared window, and each later file
// that waits for a frame times out.
//
// Two callbacks that each request the next frame keep the count above zero.
// The interval that starts here, on the real clock, then stays for the life of
// the window. One callback cannot do this: jsdom removes a callback before it
// runs it, so the count goes to zero between the two steps. The callbacks use
// the native function, so a spy or a stub on the window does not stop them.
const framesKept = Symbol.for('midgard.framesKept')

const host = window as Window & { [framesKept]?: true }

if (!host[framesKept]) {
	host[framesKept] = true

	const request = window.requestAnimationFrame

	const keep = () => {
		request(keep)
	}

	request(keep)

	request(keep)
}
