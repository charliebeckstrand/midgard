// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isPrimaryPress } from '../../utilities/primary-press'

const press = { isPrimary: true, button: 0, ctrlKey: false }

describe('isPrimaryPress', () => {
	it('accepts a plain primary press', () => {
		expect(isPrimaryPress(press)).toBe(true)
	})

	// On macOS a Ctrl-click is the secondary click. It sends button 0 with ctrlKey.
	it.each([
		['a Ctrl-click', { ctrlKey: true }],
		['a secondary button', { button: 2 }],
		['a middle button', { button: 1 }],
		['a pointer that is not primary', { isPrimary: false }],
	])('refuses %s', (_, change) => {
		expect(isPrimaryPress({ ...press, ...change })).toBe(false)
	})
})
