import { describe, expect, it } from 'vitest'
import { NumberInput } from '../../../components/number-input'
import { renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

const frameWidth = () =>
	screen.getByRole('spinbutton').closest('[data-slot=control-frame]')?.getBoundingClientRect()
		.width ?? Number.NaN

/**
 * The `width` of a NumberInput. With `auto`, a host that gives no width, such
 * as a flex row, gives the field the width of its value, and the field grows
 * with the value. A host that gives a width, such as a block, wins. With
 * `fill`, the field takes the width of the host in each layout.
 *
 * Rides the real browser because the claim is a computed one: jsdom lays out
 * no box.
 */
describe('the width of a NumberInput (real browser)', () => {
	it('takes the width of its value in a flex row, and grows with the value', () => {
		const { rerender } = renderUI(
			<div style={{ display: 'flex', width: 360 }}>
				<NumberInput aria-label="Rows" value={3} />
			</div>,
		)

		const short = frameWidth()

		expect(short).toBeLessThan(180)

		rerender(
			<div style={{ display: 'flex', width: 360 }}>
				<NumberInput aria-label="Rows" value={333_333} />
			</div>,
		)

		expect(frameWidth()).toBeGreaterThan(short)

		expect(frameWidth()).toBeLessThan(360)
	})

	it('fills a host that gives a width', () => {
		renderUI(
			<div style={{ width: 360 }}>
				<NumberInput aria-label="Rows" value={3} />
			</div>,
		)

		expect(frameWidth()).toBeNear(360, HALF_PIXEL)
	})

	it('fills a flex row with `width="fill"`', () => {
		renderUI(
			<div style={{ display: 'flex', width: 360 }}>
				<NumberInput aria-label="Rows" value={3} width="fill" />
			</div>,
		)

		expect(frameWidth()).toBeNear(360, HALF_PIXEL)
	})
})
