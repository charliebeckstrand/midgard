import { describe, expect, it, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { SignaturePad } from '../../components/signature-pad'
import { RangeSlider } from '../../components/slider'
import { Form } from '../../modules/form'
import { allBySlot, getSlot, renderUI } from '../helpers'
import { press } from './helpers/drag'

/**
 * A disabled Form disables the controls that a native `<fieldset disabled>`
 * does not reach. The file runs in the real browser, so the press goes through
 * the real mouse and pointer capture.
 */
describe('a disabled Form (real browser)', () => {
	it('keeps both values of a RangeSlider after a press on its track', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{}} disabled>
				<div style={{ width: 400 }}>
					<RangeSlider defaultValue={[20, 80]} onValueChange={onValueChange} />
				</div>
			</Form>,
		)

		const root = getSlot(container, 'slider-range')

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		await press('[data-slot="slider-range"]', { x: 0.5, y: 0.5 })

		await userEvent.hover(root)

		await commands.releasePointer()

		expect(onValueChange).not.toHaveBeenCalled()

		expect(lo).toHaveAttribute('aria-valuenow', '20')

		expect(hi).toHaveAttribute('aria-valuenow', '80')
	})

	it('refuses a stroke on a SignaturePad, and marks its canvas aria-disabled', async () => {
		const onDrawStart = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ signature: null }} disabled>
				<div style={{ width: 400 }}>
					<SignaturePad name="signature" onDrawStart={onDrawStart} />
				</div>
			</Form>,
		)

		const canvas = getSlot(container, 'signature-pad-canvas')

		expect(canvas).toHaveAttribute('aria-disabled', 'true')

		await press('[data-slot="signature-pad-canvas"]', { x: 0.5, y: 0.5 })

		await userEvent.hover(canvas)

		await commands.releasePointer()

		expect(onDrawStart).not.toHaveBeenCalled()
	})
})
