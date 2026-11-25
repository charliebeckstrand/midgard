import { cleanup, configure } from '@testing-library/react'
import { afterEach, inject } from 'vitest'

declare module 'vitest' {
	interface ProvidedContext {
		asyncUtilTimeout: number
	}
}

// The budget of `waitFor` and `findBy` comes from the shared config
// (`vitest.shared.mts`), which sets it with `testTimeout` for the speed of the
// machine.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

// A file in the node environment also loads this file. The lines below are for
// a file in jsdom only.
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
