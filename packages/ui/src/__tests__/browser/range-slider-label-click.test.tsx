import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Field, Label } from '../../components/fieldset'
import { RangeSlider } from '../../components/slider'
import { allBySlot, renderUI } from '../helpers'

/**
 * A click on the Field Label of a `RangeSlider` focuses the start thumb, as a click on the Label
 * of a `Slider` focuses its native input.
 *
 * The Field Label targets the start thumb, a `<button>`, and some browsers do not focus a button on
 * a label click. The test uses a real browser, because the label activation of jsdom is a model, not
 * the platform behavior. The real click also sends the full pointer sequence, so the test shows that
 * the click moves no value.
 */
describe('a click on the RangeSlider Field Label (real browser)', () => {
	const renderLabeled = (disabled?: boolean) => {
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
		const { lo, hi, label } = renderLabeled()

		await userEvent.click(label)

		expect(document.activeElement).toBe(lo)

		expect(lo).toHaveAttribute('aria-valuenow', '20')

		expect(hi).toHaveAttribute('aria-valuenow', '50')
	})

	// Chromium focuses a button on a label click, and WebKit and Firefox do not. A
	// dispatched click moves no focus in any engine, so it stands in for the click
	// that the label sends to the start thumb in those engines.
	it('focuses the start thumb on the click that the label sends to it', () => {
		const { lo, hi } = renderLabeled()

		lo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(document.activeElement).toBe(lo)

		expect(lo).toHaveAttribute('aria-valuenow', '20')

		expect(hi).toHaveAttribute('aria-valuenow', '50')
	})

	it('focuses no thumb when the slider is disabled', async () => {
		const { lo, hi, label } = renderLabeled(true)

		// The label targets the disabled start thumb, so Playwright reads the label as
		// disabled and waits. `force` skips that check, as a user can still click the label.
		await userEvent.click(label, { force: true })

		expect(document.activeElement).not.toBe(lo)

		expect(document.activeElement).not.toBe(hi)
	})
})
