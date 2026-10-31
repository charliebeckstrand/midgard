import { describe, expect, it } from 'vitest'
import { Input } from '../../components/input'
import { present, renderUI } from '../helpers'
import { acrossHover } from './helpers/across-hover'
import { holdRootClass } from './helpers/root-state'

/**
 * A framed control keeps its validation ring under the pointer, in both modes.
 *
 * The neutral hover ring of `kasane.layers` has a dark twin. Tailwind emits a `dark:` class
 * after the `has-[[data-invalid]]:hover:` class, and the two have the same specificity. So in
 * dark mode the gray hover ring replaced the red ring of an invalid control. The neutral hover
 * now skips each validation state, like the focus ring.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the validation ring of a framed control under the pointer (real browser)', () => {
	async function ringBeforeAndAfterHover(dark: boolean) {
		if (dark) holdRootClass('dark')

		const { container } = renderUI(<Input aria-label="Email" invalid />)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'control frame')

		return acrossHover(frame, 'boxShadow')
	}

	it.for([
		['light', false],
		['dark', true],
	] as const)('keeps the red ring on hover in %s mode', async ([, dark]) => {
		const { before, after } = await ringBeforeAndAfterHover(dark)

		expect(after).toBe(before)
	})

	/** The neutral hover still exists. A guard that suppressed it everywhere would pass the two above. */
	it('still darkens the ring of a control with no validation state', async () => {
		const { container } = renderUI(<Input aria-label="Email" />)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'control frame')

		const { before, after } = await acrossHover(frame, 'boxShadow')

		expect(after).not.toBe(before)
	})
})
