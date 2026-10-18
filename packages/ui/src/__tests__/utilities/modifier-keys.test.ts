// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hasBrowserModifier } from '../../utilities/modifier-keys'

const press = { ctrlKey: false, metaKey: false, altKey: false }

describe('hasBrowserModifier', () => {
	it('refuses a plain press', () => {
		expect(hasBrowserModifier(press)).toBe(false)
	})

	it.each([
		['Ctrl', { ctrlKey: true }],
		['Meta', { metaKey: true }],
		['Alt', { altKey: true }],
	])('accepts a press that holds %s', (_, change) => {
		expect(hasBrowserModifier({ ...press, ...change })).toBe(true)
	})

	// The `+` key needs Shift, so Shift alone is not a browser chord.
	it('refuses a press that holds only Shift', () => {
		const shift = { ...press, shiftKey: true }

		expect(hasBrowserModifier(shift)).toBe(false)
	})
})
