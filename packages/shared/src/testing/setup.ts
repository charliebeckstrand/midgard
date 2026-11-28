/**
 * The setup file of the test suite of each app. The vitest config of an app
 * names it in `setupFiles` as `shared/testing/setup`.
 *
 * @remarks A suite in the node environment loads this file too. The parts that
 * need a DOM run only when `window` exists.
 */

// This import adds the DOM matchers of jest-dom, such as `toBeInTheDocument`. A
// file in the node environment loads it too, and a matcher reads the DOM only
// when a case calls it.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, inject } from 'vitest'

declare module 'vitest' {
	interface ProvidedContext {
		asyncUtilTimeout: number
	}
}

// A browser resolves a same-origin path, and the `Request` of Node takes only an
// absolute URL. A setup file runs before the test file imports its modules.
globalThis.Request = class extends Request {
	constructor(input: RequestInfo | URL, init?: RequestInit) {
		super(typeof input === 'string' ? new URL(input, 'http://localhost') : input, init)
	}
}

// The budget of `waitFor` and `findBy` comes from the shared config
// (`vitest.shared.mts`), which sets it with `testTimeout` for the speed of the
// machine.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

if (typeof window !== 'undefined') {
	// The config sets no `globals`, so Testing Library does not unmount on its own.
	afterEach(cleanup)

	// jsdom has no `ResizeObserver`. Panels, tab lists, and menus measure
	// themselves with one. No case reads the callback, so the stub is inert.
	window.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	}

	// jsdom has no layout, and a trail measures the text of its crumbs.
	Range.prototype.getBoundingClientRect ??= () => new DOMRect()
}
