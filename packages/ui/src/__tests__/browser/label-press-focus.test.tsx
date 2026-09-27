import { describe, expect, it, onTestFinished } from 'vitest'
import { commands } from 'vitest/browser'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { RangeSlider } from '../../components/slider'
import { allBySlot, renderUI } from '../helpers'

/**
 * A press on a Field Label keeps the focus on a control that has it, and the `click` focuses a
 * control that does not.
 *
 * The test uses a real browser and a real mouse, because the focus change of a `mousedown` is a
 * default action of the platform. A dispatched event does not cause it, and jsdom does not model it.
 */
describe('a press on a Field Label (real browser)', () => {
	const press = async (selector: string) => {
		onTestFinished(() => commands.releasePointer())

		await commands.pressPointer(selector)
	}

	const renderInput = () => {
		const view = renderUI(
			<>
				<Field>
					<Label>Name</Label>
					<Input />
				</Field>
				<p data-testid="outside">Outside</p>
			</>,
		)

		const input = view.getByRole('textbox')

		const blurs: string[] = []

		input.addEventListener('blur', () => blurs.push('blur'))

		return { input, blurs }
	}

	it('keeps the focus on the focused input through the press', async () => {
		const { input, blurs } = renderInput()

		input.focus()

		await press('[data-slot="label"]')

		expect(document.activeElement).toBe(input)

		await commands.releasePointer('[data-slot="label"]')

		expect(document.activeElement).toBe(input)

		expect(blurs).toEqual([])
	})

	it('focuses an unfocused input on the click, not on the press', async () => {
		const { input } = renderInput()

		await press('[data-slot="label"]')

		expect(document.activeElement).not.toBe(input)

		await commands.releasePointer('[data-slot="label"]')

		expect(document.activeElement).toBe(input)
	})

	it('does not focus the input when the press ends outside the label', async () => {
		const { input } = renderInput()

		await press('[data-slot="label"]')

		await commands.releasePointer('[data-testid="outside"]')

		expect(document.activeElement).not.toBe(input)
	})

	it('keeps the focus on a focused RangeSlider thumb through the press', async () => {
		const { container } = renderUI(
			<Field>
				<Label>Price</Label>
				<RangeSlider defaultValue={[20, 50]} />
			</Field>,
		)

		const [lo] = allBySlot(container, 'slider-range-thumb')

		lo?.focus()

		await press('[data-slot="label"]')

		expect(document.activeElement).toBe(lo)
	})
})
