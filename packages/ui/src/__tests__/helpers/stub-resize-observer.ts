import { vi } from 'vitest'

/**
 * One constructed observer: the spies a test asserts on, the targets it holds,
 * and the callback it fires by hand.
 */
export type ResizeObserverStub = {
	observe: ReturnType<typeof vi.fn>
	unobserve: ReturnType<typeof vi.fn>
	disconnect: ReturnType<typeof vi.fn>
	/** Every element still under this observer, in observe order. */
	targets: Element[]
	callback: ResizeObserverCallback
}

/**
 * Stubs `ResizeObserver` and collects every instance the subject constructs, so
 * a test drives a resize by hand. `setup/jsdom-stubs.ts` installs an inert
 * observer for the whole suite; this replaces it where a test must hold the
 * callback and fire it.
 *
 * Returns the live array, which fills as the subject renders. `unstubGlobals`
 * puts the suite-wide stub back before the next test, so no caller restores it.
 *
 * Kept off `helpers/index.ts`: that barrel reaches ~210 test files and six need
 * this one.
 */
export function stubResizeObserver(): ResizeObserverStub[] {
	const instances: ResizeObserverStub[] = []

	class Stub {
		targets: Element[] = []

		// Spies that also keep the target list, so a test can assert the call and
		// deliver an entry per observed element from the one stub.
		observe = vi.fn((target: Element) => {
			this.targets.push(target)
		})

		unobserve = vi.fn((target: Element) => {
			this.targets = this.targets.filter((held) => held !== target)
		})

		disconnect = vi.fn(() => {
			this.targets = []
		})

		callback: ResizeObserverCallback

		constructor(cb: ResizeObserverCallback) {
			this.callback = cb

			instances.push(this)
		}
	}

	// `lib.dom`'s `ResizeObserver` has overloaded constructor signatures that
	// `vi.fn()`-shaped methods don't satisfy structurally; the cast narrows to
	// the runtime contract the subjects use.
	vi.stubGlobal('ResizeObserver', Stub as unknown as typeof ResizeObserver)

	return instances
}
