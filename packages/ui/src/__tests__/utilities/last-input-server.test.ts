// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { lastInput } from '../../utilities/last-input'

describe('lastInput on the server', () => {
	// The docblock gives a page with no DOM, so the module loads without its listeners.
	it('loads without the DOM, and records no input', () => {
		expect(lastInput()).toBeNull()
	})
})
