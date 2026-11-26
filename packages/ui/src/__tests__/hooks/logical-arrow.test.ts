// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { logicalArrow } from '../../hooks/a11y/logical-arrow'

/**
 * The cursor moves by column index. In a right-to-left grid, the columns run
 * from right to left, so the horizontal arrows swap their meaning.
 */
describe('logicalArrow', () => {
	it('keeps each key in a left-to-right grid', () => {
		for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Home', 'End']) {
			expect(logicalArrow(key, false)).toBe(key)
		}
	})

	it('swaps the horizontal arrows in a right-to-left grid', () => {
		expect(logicalArrow('ArrowLeft', true)).toBe('ArrowRight')

		expect(logicalArrow('ArrowRight', true)).toBe('ArrowLeft')
	})

	it('keeps the vertical arrows, Home, and End in a right-to-left grid', () => {
		for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) {
			expect(logicalArrow(key, true)).toBe(key)
		}
	})
})
