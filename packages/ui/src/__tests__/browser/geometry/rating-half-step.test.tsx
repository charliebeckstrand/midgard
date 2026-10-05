import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Rating } from '../../../components/rating'
import { renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/** The box of the first element of `slot` in `container`. */
function box(container: HTMLElement, slot: string, index = 0): DOMRect {
	const element = container.querySelectorAll(`[data-slot="${slot}"]`)[index]

	if (!element) throw new Error(`no ${slot} at ${index}`)

	return element.getBoundingClientRect()
}

/**
 * A Rating at a half step splits each star into a start half and an end half.
 * The halves and the part fill sit on the inline axis, so a right-to-left row
 * mirrors them. Only a real browser lays out the inline axis.
 */
describe('Rating: half step', () => {
	it('puts the start half on the left of a left-to-right star', () => {
		const { container } = renderUI(<Rating aria-label="Score" step={0.5} defaultValue={2.5} />)

		const star = box(container, 'rating-star', 2)

		const [start, end] = [box(container, 'rating-half', 4), box(container, 'rating-half', 5)]

		expect(start.left).toBeNear(star.left, HALF_PIXEL)

		expect(end.right).toBeNear(star.right, HALF_PIXEL)

		expect(start.width).toBeNear(star.width / 2, HALF_PIXEL)

		expect(box(container, 'rating-fill', 2).left).toBeNear(star.left, HALF_PIXEL)
	})

	it('puts the start half on the right of a right-to-left star', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<Rating aria-label="Score" step={0.5} defaultValue={2.5} />
			</div>,
		)

		const star = box(container, 'rating-star', 2)

		const [start, end] = [box(container, 'rating-half', 4), box(container, 'rating-half', 5)]

		expect(start.right).toBeNear(star.right, HALF_PIXEL)

		expect(end.left).toBeNear(star.left, HALF_PIXEL)

		// The part fill grows from the inline start, which is the right edge here.
		const fill = box(container, 'rating-fill', 2)

		expect(fill.right).toBeNear(star.right, HALF_PIXEL)

		expect(fill.width).toBeNear(star.width / 2, HALF_PIXEL)
	})

	it('moves one half on an arrow key', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Rating aria-label="Score" step={0.5} defaultValue={2.5} onValueChange={onValueChange} />,
		)

		const checked = container.querySelector<HTMLInputElement>('input:checked')

		checked?.focus()

		await userEvent.keyboard('{ArrowRight}')

		expect(onValueChange).toHaveBeenLastCalledWith(3)

		await userEvent.keyboard('{ArrowLeft}')

		expect(onValueChange).toHaveBeenLastCalledWith(2.5)
	})

	it('moves to the next half on ArrowLeft in a right-to-left row', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<div dir="rtl">
				<Rating aria-label="Score" step={0.5} defaultValue={2.5} onValueChange={onValueChange} />
			</div>,
		)

		container.querySelector<HTMLInputElement>('input:checked')?.focus()

		await userEvent.keyboard('{ArrowLeft}')

		expect(onValueChange).toHaveBeenLastCalledWith(3)
	})
})
