import { describe, expect, it } from 'vitest'
import { Description, Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { bySlot, densityStepOf, getSlot, renderUI, screen } from '../helpers'

describe('Radio', () => {
	it('renders a radio input with data-slot="radio"', () => {
		const { container } = renderUI(<Radio />)

		const el = getSlot<HTMLInputElement>(container, 'radio')

		expect(el.tagName).toBe('INPUT')

		expect(el.type).toBe('radio')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Radio name="choice" value="a" />)

		const el = getSlot<HTMLInputElement>(container, 'radio')

		expect(el.name).toBe('choice')

		expect(el.value).toBe('a')
	})

	it('marks the control wrapper with data-disabled when disabled', () => {
		const { container } = renderUI(<Radio disabled />)

		const wrapper = bySlot(container, 'control')

		expect(wrapper).toHaveAttribute('data-disabled')
	})
})

describe('RadioGroup', () => {
	it('renders with role="radiogroup" and forwards the required name', () => {
		renderUI(<RadioGroup aria-label="Plan">content</RadioGroup>)

		expect(screen.getByRole('radiogroup')).toBeInTheDocument()

		expect(screen.getByRole('radiogroup')).toHaveAccessibleName('Plan')
	})

	it('keeps the radiogroup role when a consumer supplies one', () => {
		renderUI(
			<RadioGroup aria-label="Plan" role="group">
				content
			</RadioGroup>,
		)

		// §3.9: `role` is load-bearing, so the radiogroup semantics stay.
		expect(screen.getByRole('radiogroup')).toBeInTheDocument()
	})
})

describe('Radio size', () => {
	it('opens a scope for an explicit size prop', () => {
		const { container } = renderUI(<Radio size="lg" />)

		expect(getSlot(container, 'control')).toHaveAttribute('data-density', 'lg')

		expect(densityStepOf(getSlot(container, 'radio-indicator'))).toBe('lg')
	})
})

describe('RadioField aria-describedby', () => {
	it('points the radio at a rendered Description', () => {
		const { container } = renderUI(
			<RadioField>
				<Radio />
				<Description>Receive email notifications.</Description>
			</RadioField>,
		)

		const input = getSlot<HTMLInputElement>(container, 'radio')

		const description = getSlot(container, 'description')

		expect(description.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', description.id)
	})
})

describe('Radio touch', () => {
	// When the page is zoomed in, iOS holds a tap for a possible double tap. A
	// second tap on a near row in that time joins the first, and neither selects.
	it('stops the double-tap wait on the group, the row, and the radio', () => {
		const { container } = renderUI(
			<RadioGroup aria-label="Plan">
				<RadioField>
					<Radio name="plan" value="starter" />
					<Label>Starter</Label>
				</RadioField>
			</RadioGroup>,
		)

		expect(screen.getByRole('radiogroup')).toHaveClass('touch-manipulation')

		const field = getSlot(container, 'field')

		expect(field).toHaveClass('touch-manipulation')

		expect(getSlot(field, 'control')).toHaveClass('touch-manipulation')
	})
})
