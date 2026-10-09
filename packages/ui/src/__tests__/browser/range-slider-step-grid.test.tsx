import { describe, expect, it, onTestFinished } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { RangeSlider } from '../../components/slider'
import { allBySlot, getSlot, present, renderUI } from '../helpers'

/**
 * A press near max on two thumbs stacked at max waits for the first move, and a move down drags the
 * start thumb.
 *
 * With min 2, max 10, and step 3, the step grid holds 11, past max. Before, the pointer clamped
 * the press value and then snapped it, so a press near max read 11. That is above the stack, so
 * the press grabbed the end thumb. Without `allowCross`, the end thumb cannot go below the start
 * thumb, so a drag down moved neither thumb. The pointer now snaps and then clamps, as the value
 * setter and the keyboard do, and the press reads 10, on the stack.
 *
 * The file runs in the real browser, so the drag goes through the real mouse and pointer capture.
 */
describe('a RangeSlider press near max on a stack at max (real browser)', () => {
	it('drags the start thumb down from the stack', async () => {
		const { container } = renderUI(
			<div style={{ width: 400 }}>
				<RangeSlider min={2} max={10} step={3} defaultValue={[10, 10]} allowCross={false} />
			</div>,
		)

		const root = getSlot(container, 'slider-range')

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		onTestFinished(() => commands.releasePointer())

		// 95% along the track is the raw value 9.6, which the step grid snaps to 11. The point is clear
		// of the thumbs at max, so the press lands on the track.
		await commands.pressPointer('[data-slot="slider-range"]', { x: 0.95, y: 0.5 })

		// The center of the track is the raw value 6, which snaps to 5.
		await userEvent.hover(root)

		await commands.releasePointer()

		expect(present(lo, 'the start thumb')).toHaveAttribute('aria-valuenow', '5')

		expect(present(hi, 'the end thumb')).toHaveAttribute('aria-valuenow', '10')
	})
})
