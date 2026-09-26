import { describe, expect, it } from 'vitest'
import { Description, Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { bySlot, getSlot, renderUI, screen } from '../helpers'

describe('Radio', () => {
	it('renders with data-slot="radio"', () => {
		const { container } = renderUI(<Radio />)

		const el = bySlot(container, 'radio')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('INPUT')
	})

	it('renders as a radio input', () => {
		const { container } = renderUI(<Radio />)

		const el = getSlot<HTMLInputElement>(container, 'radio')

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
	it('defaults to md (size-5)', () => {
		const { container } = renderUI(<Radio />)

		expect(bySlot(container, 'control')?.className).toContain('size-5')
	})

	it('reflects an explicit size prop', () => {
		const { container } = renderUI(<Radio size="lg" />)

		expect(bySlot(container, 'control')?.className).toContain('size-5')
	})

	it('indicator dot scales with size', () => {
		const { container } = renderUI(<Radio size="lg" />)

		expect(bySlot(container, 'radio-indicator')?.className).toContain('size-2')
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

describe('RadioField touch', () => {
	// On iOS, a tap that waits for a double-tap zoom can join the next tap.
	it('stops the double-tap wait on the whole radio row', () => {
		const { container } = renderUI(
			<RadioField>
				<Radio />
				<Label>Starter</Label>
			</RadioField>,
		)

		const field = getSlot(container, 'field')

		expect(field).toHaveClass('touch-manipulation')

		expect(getSlot(field, 'control').className).toContain('touch-manipulation')
	})
})
