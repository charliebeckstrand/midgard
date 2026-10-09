import { afterEach, describe, expect, it, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { HoldButton } from '../../components/hold-button'
import { RangeSlider } from '../../components/slider'
import { allBySlot, present, renderUI } from '../helpers'

/**
 * A Ctrl-click starts no gesture.
 *
 * On macOS a Ctrl-click is the secondary click. It sends `button === 0` with `ctrlKey`, and it
 * opens a context menu, which can take the release. Before, a HoldButton and a RangeSlider read
 * only `button`, so a Ctrl-click started a hold or wrote a value. Each case holds Ctrl on the real
 * keyboard and presses the real mouse, so the browser builds the pointer events.
 */
describe('a Ctrl-click on a gesture surface (real browser)', () => {
	afterEach(async () => {
		await commands.releasePointer()

		await userEvent.keyboard('{/Control}')
	})

	it('starts no HoldButton hold', async () => {
		const onHoldStart = vi.fn()

		renderUI(<HoldButton onHoldStart={onHoldStart}>Hold</HoldButton>)

		await userEvent.keyboard('{Control>}')

		await commands.pressPointer('[data-slot="hold-button"]')

		expect(onHoldStart).not.toHaveBeenCalled()
	})

	it('writes no RangeSlider value', async () => {
		const { container } = renderUI(
			<div style={{ width: 400 }}>
				<RangeSlider defaultValue={[20, 80]} />
			</div>,
		)

		await userEvent.keyboard('{Control>}')

		// A tenth of the way along the track is the value 10, nearest the start thumb.
		await commands.pressPointer('[data-slot="slider-range"]', { x: 0.1, y: 0.5 })

		const [lo] = allBySlot(container, 'slider-range-thumb')

		expect(present(lo, 'the start thumb')).toHaveAttribute('aria-valuenow', '20')
	})
})
