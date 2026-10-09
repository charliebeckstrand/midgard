// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isPrimaryPress } from '../../utilities/primary-press'

const press = { isPrimary: true, button: 0, ctrlKey: false }

describe('isPrimaryPress', () => {
	it('accepts a plain primary press', () => {
		expect(isPrimaryPress(press)).toBe(true)
	})

	// A mouse event has no `isPrimary`. The browser sends it only for the primary pointer.
	it('accepts a plain mouse press, which carries no isPrimary', () => {
		expect(isPrimaryPress({ button: 0, ctrlKey: false })).toBe(true)
	})

	it('refuses a mouse Ctrl-click', () => {
		expect(isPrimaryPress({ button: 0, ctrlKey: true })).toBe(false)
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
