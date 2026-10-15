import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { RangeSlider } from '../../components/slider'
import { allBySlot, getSlot, renderUI } from '../helpers'

/**
 * A pointer on a read-only RangeSlider. The press focuses the nearest thumb, as on a live slider,
 * but the press and the drag change no value and start no drag.
 *
 * The file runs in the real browser, so the drag goes through the real mouse and pointer capture.
 */
describe('a pointer on a read-only RangeSlider (real browser)', () => {
	it('focuses the nearest thumb and keeps both values', async () => {
		const onValueChange = vi.fn()

		const onDragStart = vi.fn()

		const onDragEnd = vi.fn()

		const { container } = renderUI(
			<div style={{ width: 400 }}>
				<RangeSlider
					readOnly
					defaultValue={[20, 80]}
					onValueChange={onValueChange}
					onDragStart={onDragStart}
					onDragEnd={onDragEnd}
				/>
			</div>,
		)

		const root = getSlot(container, 'slider-range')

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		onTestFinished(() => commands.releasePointer())

		// 10% along the track is nearer the start thumb at 20.
		await commands.pressPointer('[data-slot="slider-range"]', { x: 0.1, y: 0.5 })

		await userEvent.hover(root)

		await commands.releasePointer()

		expect(onValueChange).not.toHaveBeenCalled()

		expect(onDragStart).not.toHaveBeenCalled()

		expect(onDragEnd).not.toHaveBeenCalled()

		expect(lo).toHaveAttribute('aria-valuenow', '20')

		expect(hi).toHaveAttribute('aria-valuenow', '80')

		expect(lo).toHaveFocus()
	})
})
