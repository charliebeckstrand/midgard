import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Field, Label } from '../../components/fieldset'
import { RangeSlider } from '../../components/slider'
import { allBySlot, renderUI } from '../helpers'

/**
 * A click on the Field Label of a `RangeSlider` focuses the start thumb, as a click on the Label
 * of a `Slider` focuses its native input.
 *
 * The root of the range is a `<div>`, and a `<div>` is not labelable. The test uses a real browser,
 * because the label activation of jsdom is a model, not the platform behavior. The real click also
 * sends the full pointer sequence, so the test shows that the click moves no value.
 */
describe('a click on the RangeSlider Field Label (real browser)', () => {
	const renderLabelled = (disabled?: boolean) => {
		const { container, getByText } = renderUI(
			<Field>
				<Label>Price</Label>
				<RangeSlider defaultValue={[20, 50]} disabled={disabled} />
			</Field>,
		)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		return { lo, hi, label: getByText('Price') }
	}

	it('focuses the start thumb and keeps both values', async () => {
		const { lo, hi, label } = renderLabelled()

		await userEvent.click(label)

		expect(document.activeElement).toBe(lo)

		expect(lo).toHaveAttribute('aria-valuenow', '20')

		expect(hi).toHaveAttribute('aria-valuenow', '50')
	})

	it('focuses no thumb when the slider is disabled', async () => {
		const { lo, hi, label } = renderLabelled(true)

		await userEvent.click(label)

		expect(document.activeElement).not.toBe(lo)

		expect(document.activeElement).not.toBe(hi)
	})
})
