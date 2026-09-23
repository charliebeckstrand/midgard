import { describe, expect, it, vi } from 'vitest'
import { Description } from '../../components/fieldset'
import { Form } from '../../components/form'
import { Switch, SwitchField } from '../../components/switch'
import { bySlot, fireEvent, getSlot, present, renderUI } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('Switch', () => {
	it('keeps the switch role and synced aria-checked over consumer props', () => {
		const { container } = renderUI(<Switch checked onChange={() => {}} role="checkbox" />)

		const input = present<HTMLInputElement>(container.querySelector('input'), 'input')

		// Internal wiring wins over a consumer spread.
		expect(input).toHaveAttribute('role', 'switch')

		expect(input).toHaveAttribute('aria-checked', 'true')
	})

	it('renders a checkbox input with data-slot="switch" and a thumb element', () => {
		const { container } = renderUI(<Switch />)

		const input = bySlot(container, 'switch')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(input).toHaveAttribute('type', 'checkbox')

		const thumb = bySlot(container, 'switch-thumb')

		expect(thumb).toBeInTheDocument()

		expect(thumb).toHaveAttribute('aria-hidden', 'true')
	})

	it('forwards checked and onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Switch checked={true} onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		expect(onChange).toHaveBeenCalled()
	})
})

describe('Switch in a Form', () => {
	it('binds checked to the form field by name and chains onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ dark: false }}>
				<Switch name="dark" onChange={onChange} />
				<FieldProbe name="dark" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		expect(input.checked).toBe(false)

		fireEvent.click(input)

		expect(input.checked).toBe(true)

		expect(input).toHaveAttribute('aria-checked', 'true')

		expect(getFieldProbe('dark').textContent).toBe('true')

		expect(onChange).toHaveBeenCalled()
	})

	it('lets an explicit checked prop win over the form binding', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ dark: false }}>
				<Switch name="dark" checked onChange={onChange} />
				<FieldProbe name="dark" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		// The consumer's handler resolves; the store stays untouched.
		expect(getFieldProbe('dark').textContent).toBe('false')

		expect(onChange).toHaveBeenCalled()
	})
})

describe('SwitchField aria-describedby', () => {
	it('points the switch at a rendered Description', () => {
		const { container } = renderUI(
			<SwitchField>
				<Switch />
				<Description>Enable dark mode.</Description>
			</SwitchField>,
		)

		const input = getSlot<HTMLInputElement>(container, 'switch')

		const description = getSlot(container, 'description')

		expect(description.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', description.id)
	})
})
