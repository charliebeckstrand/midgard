import { describe, expect, it } from 'vitest'
import { Input } from '../../../components/input'
import { Textarea } from '../../../components/textarea'
import { densitySteps } from '../../../core/density'
import { getSlot, renderUI } from '../../helpers'

/**
 * The minimum height of a textarea steps with density. A textarea of one row
 * has the height of an Input at each step, so the floor does not make it
 * taller than its padding and one line of text.
 *
 * Rides the real browser because the claim is a layout one: jsdom loads no
 * stylesheet.
 */
function height(el: Element): number {
	return el.getBoundingClientRect().height
}

describe('Textarea floor (real browser)', () => {
	it.each(densitySteps)('has the height of an Input with one row at the %s step', (step) => {
		const { container } = renderUI(
			<div data-density={step}>
				<Input aria-label="Input" />
				<Textarea aria-label="Textarea" rows={1} />
			</div>,
		)

		const input = getSlot(container, 'control-frame')
		const textarea = getSlot(container, 'textarea')

		expect(height(textarea)).toBe(height(input))
	})
})
