import { afterEach } from 'vitest'

// @testing-library/user-event's `userEvent.setup()` calls patchFocus(), which
// replaces HTMLElement.prototype.focus/blur with getter-only accessors and
// never restores them. The unit project runs `isolate: false`, so the prototype
// is shared across every test file in the worker and the getter-only `focus`
// leaks: later files that assign `el.focus = vi.fn()` throw "Cannot set property
// focus ... which has only a getter". Capture the pristine native methods now
// and reinstate them after each test. Under `isolate: false` this module
// evaluates once per worker, ahead of every test file, so the capture is
// guaranteed to precede the first userEvent.setup rather than merely happening
// to.

const pristine: Array<[object, string, PropertyDescriptor]> = []

for (const proto of [HTMLElement.prototype]) {
	for (const name of ['focus', 'blur'] as const) {
		const desc = Object.getOwnPropertyDescriptor(proto, name)

		if (desc && typeof desc.value === 'function') {
			pristine.push([proto, name, desc])
		}
	}
}

afterEach(() => {
	for (const [proto, name, desc] of pristine) {
		const current = Object.getOwnPropertyDescriptor(proto, name)

		if (current?.get && typeof current.value !== 'function') {
			Object.defineProperty(proto, name, desc)
		}
	}
})
