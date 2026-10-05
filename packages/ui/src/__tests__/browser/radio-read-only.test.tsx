import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { renderUI, screen } from '../helpers'

const PLANS = ['starter', 'business', 'enterprise'] as const

/**
 * A read-only RadioGroup with uncontrolled radios keeps its selection.
 *
 * A read-only radio cancels its click, and the browser then checks the old radio of the group
 * again. jsdom does not model that step: it clears the clicked radio and leaves no radio checked.
 * The arrow keys run here too, because the browser moves the focus and clicks the next radio.
 */
describe('a read-only uncontrolled RadioGroup (real browser)', () => {
	const renderPlans = (readOnly: boolean, onChange?: () => void) => (
		<RadioGroup aria-label="Plan" readOnly={readOnly}>
			{PLANS.map((name) => (
				<RadioField key={name}>
					<Radio
						name="read-only-plan"
						value={name}
						defaultChecked={name === 'starter'}
						onChange={onChange}
					/>
					<Label>{name}</Label>
				</RadioField>
			))}
		</RadioGroup>
	)

	const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name })

	const checked = () => PLANS.filter((name) => radio(name).checked)

	it('keeps the selection on a click, a click on the label, and a Space press', async () => {
		const onChange = vi.fn()

		renderUI(renderPlans(true, onChange))

		await userEvent.click(radio('business'))

		expect(checked()).toEqual(['starter'])

		await userEvent.click(screen.getByText('enterprise'))

		expect(checked()).toEqual(['starter'])

		radio('business').focus()

		await userEvent.keyboard(' ')

		expect(checked()).toEqual(['starter'])

		expect(onChange).not.toHaveBeenCalled()

		expect(radio('business')).toHaveFocus()
	})

	it('moves the focus with the arrow keys and keeps the selection', async () => {
		renderUI(renderPlans(true))

		radio('starter').focus()

		await userEvent.keyboard('{ArrowDown}')

		expect(radio('business')).toHaveFocus()

		await userEvent.keyboard('{ArrowDown}')

		expect(radio('enterprise')).toHaveFocus()

		expect(checked()).toEqual(['starter'])
	})

	it('checks a radio and fires onChange again when readOnly turns off', async () => {
		const onChange = vi.fn()

		const { rerender } = renderUI(renderPlans(true, onChange))

		await userEvent.click(radio('business'))

		rerender(renderPlans(false, onChange))

		await userEvent.click(radio('business'))

		expect(checked()).toEqual(['business'])

		expect(onChange).toHaveBeenCalledOnce()
	})
})
