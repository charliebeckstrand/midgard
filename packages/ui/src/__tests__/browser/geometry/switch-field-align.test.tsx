import { describe, expect, it } from 'vitest'
import { Description, Label } from '../../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../../components/radio'
import { Switch, SwitchField } from '../../../components/switch'
import { densitySteps } from '../../../core/density'
import { renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The vertical center of a box.
 */
function middle(element: Element | null) {
	if (!element) throw new Error('expected the element')

	const box = element.getBoundingClientRect()

	return box.top + box.height / 2
}

/**
 * A Switch in a SwitchField. The control spanned the label row and the
 * description row. Thus it centered on the two lines and not on the label, and a
 * large switch, which is taller than the label line, pushed the label up.
 */
describe('SwitchField: control alignment', () => {
	it.each(densitySteps)('centers a %s switch on its label', (size) => {
		const { container } = renderUI(
			<SwitchField>
				<Switch size={size} />
				<Label>Notifications</Label>
			</SwitchField>,
		)

		const control = container.querySelector('[data-slot="field"] > [data-slot="control"]')

		const label = container.querySelector('[data-slot="label"]')

		expect(middle(label)).toBeNear(middle(control), HALF_PIXEL)
	})

	it.each(densitySteps)('centers a %s switch on the label line, not on the description', (size) => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<SwitchField>
					<Switch size={size} />
					<Label>Notifications</Label>
					<Description>Send a message when a build ends.</Description>
				</SwitchField>
			</div>,
		)

		const control = container.querySelector('[data-slot="field"] > [data-slot="control"]')

		const label = container.querySelector('[data-slot="label"]')

		const description = container.querySelector('[data-slot="description"]')

		expect(middle(label)).toBeNear(middle(control), HALF_PIXEL)

		expect(description?.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			label?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
		)
	})

	it('matches the label alignment of a RadioField', () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<RadioGroup aria-label="Plan">
					<RadioField>
						<Radio value="basic" />
						<Label>Basic</Label>
						<Description>One seat.</Description>
					</RadioField>
				</RadioGroup>
			</div>,
		)

		const control = container.querySelector('[data-slot="field"] > [data-slot="control"]')

		const label = container.querySelector('[data-slot="label"]')

		expect(middle(label)).toBeNear(middle(control), HALF_PIXEL)
	})
})
