import { describe, expect, it } from 'vitest'
import { Checkbox, CheckboxField } from '../../../components/checkbox'
import { Label, Message } from '../../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../../components/radio'
import { renderUI } from '../../helpers'

/**
 * A Message in a CheckboxField or a RadioField. The toggle grid placed the
 * label and the description, but not the message, so auto placement put the
 * message in the narrow control column and it wrapped word by word.
 */
describe('Toggle field: message placement', () => {
	it.each([
		[
			'CheckboxField',
			<CheckboxField key="checkbox">
				<Checkbox />
				<Label>Accept the terms</Label>
				<Message severity="error">Accept the terms to continue</Message>
			</CheckboxField>,
		],
		[
			'RadioField',
			<RadioGroup key="radio" aria-label="Plan">
				<RadioField>
					<Radio value="basic" />
					<Label>Basic</Label>
					<Message severity="error">Pick a plan to continue</Message>
				</RadioField>
			</RadioGroup>,
		],
	])('%s puts the message under the label', (_name, element) => {
		const { container } = renderUI(<div style={{ width: 300 }}>{element}</div>)

		const label = container.querySelector('[data-slot="label"]')?.getBoundingClientRect()

		const message = container.querySelector('[data-slot="message"]')?.getBoundingClientRect()

		expect(message?.left).toBe(label?.left)

		expect(message?.top).toBeGreaterThanOrEqual(label?.bottom ?? 0)

		expect(message?.height).toBeLessThan(30)
	})
})
