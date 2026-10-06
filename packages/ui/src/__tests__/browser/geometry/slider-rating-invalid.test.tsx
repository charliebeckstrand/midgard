import { describe, expect, it } from 'vitest'
import { Field, Label, Message } from '../../../components/fieldset'
import { Rating } from '../../../components/rating'
import { Slider } from '../../../components/slider'
import { renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * Slider and Rating in a `Field` with the `error` severity. Both took the
 * invalid state, but neither showed it. The Slider was also an inline box, and
 * the strut of its line box added a gap above the message.
 */
describe('Slider and Rating: invalid field', () => {
	it('puts the message of a Slider at the gap of the field', () => {
		const { container } = renderUI(
			<Field severity="error">
				<Label>Volume</Label>
				<Slider defaultValue={95} />
				<Message severity="error">Keep the volume below 80</Message>
			</Field>,
		)

		const slider = container.querySelector('[data-slot="slider"]')?.getBoundingClientRect()

		const message = container.querySelector('[data-slot="message"]')?.getBoundingClientRect()

		expect((message?.top ?? 0) - (slider?.bottom ?? 0)).toBeNear(8, HALF_PIXEL)
	})

	it('draws the empty stars of an invalid Rating in red', () => {
		const { container } = renderUI(
			<>
				<Field severity="error">
					<Label as="span">Score</Label>
					<Rating />
				</Field>
				<Field>
					<Label as="span">Score</Label>
					<Rating />
				</Field>
			</>,
		)

		const [invalid, valid] = [...container.querySelectorAll('[data-slot="rating"]')].map((row) => {
			const star = row.querySelector('[data-slot="rating-star"] svg')

			return star ? getComputedStyle(star).color : ''
		})

		expect(invalid).not.toBe(valid)

		expect(invalid).toMatch(/oklch\(0\.577 0\.245 27\.325\)|rgb\(231, 0, 11\)/)
	})
})
