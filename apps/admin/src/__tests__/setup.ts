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

// The config sets no `globals`, so Testing Library does not unmount on its own.
afterEach(cleanup)

// The budget of `waitFor` and `findBy` comes from the shared config
// (`vitest.shared.mts`), which sets it with `testTimeout` for the speed of the
// machine.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })
