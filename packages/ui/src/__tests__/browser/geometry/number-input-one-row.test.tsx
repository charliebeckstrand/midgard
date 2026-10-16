import { describe, expect, it } from 'vitest'
import { NumberInput } from '../../../components/number-input'
import { renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * A NumberInput keeps its steppers on the row of the input.
 *
 * The affix frame wrapped. In a horizontal scroller that its siblings fill, such as the playground
 * rail of the docs on a phone, the frame shrank to its widest item, and the steppers went to a
 * second row below the label and the value.
 *
 * Rides the real browser because the claim is a computed one: jsdom lays out no box.
 */
describe('a NumberInput in a narrow host (real browser)', () => {
	it('keeps the steppers on the row of the input', () => {
		renderUI(
			<div style={{ display: 'flex', width: 320, overflowX: 'auto' }}>
				<NumberInput
					aria-label="Debounce ms"
					prefix="Debounce ms"
					className="w-44 shrink-0"
					defaultValue={500}
				/>
				<div style={{ width: 400, flexShrink: 0 }} />
			</div>,
		)

		const middle = (element: Element) => {
			const box = element.getBoundingClientRect()

			return box.top + box.height / 2
		}

		const input = screen.getByRole('spinbutton')

		expect(middle(screen.getByRole('button', { name: 'Decrease' }))).toBeNear(
			middle(input),
			HALF_PIXEL,
		)

		expect(middle(screen.getByRole('button', { name: 'Increase' }))).toBeNear(
			middle(input),
			HALF_PIXEL,
		)
	})
})
