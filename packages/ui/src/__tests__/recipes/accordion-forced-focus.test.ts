// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/accordion'
import { classNames } from '../helpers/class-stops'

/**
 * Under forced colors, the header of an accordion keeps a focus mark.
 *
 * The item draws the focus of its header with a box-shadow ring, and forced
 * colors remove a box-shadow. The header removes its own outline, so the outline
 * must be `outline-hidden`: Tailwind gives it a transparent outline under forced
 * colors, and the browser paints that outline in a system color. `outline-none`
 * has no such fallback, and the header then shows no focus. In normal mode
 * `outline-hidden` draws no outline, so the outline does not double the ring.
 */
describe('accordion header focus under forced colors', () => {
	const trigger = classNames([k.trigger])

	it('hides its focus outline with the forced-colors fallback', () => {
		expect(trigger).toContain('focus-visible:outline-hidden')
	})

	it('removes no outline without the forced-colors fallback', () => {
		expect(trigger.some((className) => /(?:^|:)outline-none$/.test(className))).toBe(false)
	})
})
