// This import adds the DOM matchers of jest-dom, such as `toBeInTheDocument`. A
// file in the node environment loads it too, and a matcher reads the DOM only
// when a case calls it.
import '@testing-library/jest-dom/vitest'

// A browser resolves a same-origin path, and the `Request` of Node takes only an
// absolute URL. A setup file runs before the test file imports its modules.
globalThis.Request = class extends Request {
	constructor(input: RequestInfo | URL, init?: RequestInit) {
		super(typeof input === 'string' ? new URL(input, 'http://localhost') : input, init)
	}
}
