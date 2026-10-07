import { describe, expect, it } from 'vitest'
import { Switch } from '../../components/switch'
import { present, renderUI } from '../helpers'

/**
 * The thumb of a checked switch moves to the end of the track.
 *
 * A stepped `density-inset-s` utility on the checked thumb wrote its rules in the `density-*`
 * sublayers of the utilities layer. A plain `inset-s-1` on the thumb is not in a sublayer, so it
 * won over the checked offset at each specificity, and the thumb stayed at the start. The checked
 * thumb now moves by a translate, so the test reads the box of the thumb, not its `left`.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the thumb of a switch (real browser)', () => {
	function thumbLeft(checked: boolean) {
		const { container } = renderUI(
			<Switch aria-label="Notifications" checked={checked} onChange={() => {}} />,
		)

		const thumb = present(container.querySelector('[data-slot="switch-thumb"]'), 'switch thumb')

		return thumb.getBoundingClientRect().left
	}

	it('moves the thumb when the switch is checked', () => {
		expect(thumbLeft(true)).toBeGreaterThan(thumbLeft(false))
	})
})
