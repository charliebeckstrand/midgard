import { describe, expect, it, vi } from 'vitest'
import { Description } from '../../components/fieldset'
import { Form, useFormField } from '../../components/form'
import { Switch, SwitchField } from '../../components/switch'
import { Density } from '../../primitives/density'
import { bySlot, fireEvent, renderUI } from '../helpers'

function FieldProbe({ name }: { name: string }) {
	const field = useFormField(name)

	return <output data-slot="probe">{String(field?.value)}</output>
}

describe('Switch', () => {
	it('keeps the switch role and synced aria-checked over consumer props', () => {
		const { container } = renderUI(<Switch checked onChange={() => {}} role="checkbox" />)

		const input = container.querySelector('input') as HTMLInputElement

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

		const input = bySlot(container, 'switch') as HTMLInputElement

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		expect(onChange).toHaveBeenCalled()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Switch />, { skeleton: true })

		expect(bySlot(container, 'switch')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
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

		const input = bySlot(container, 'switch') as HTMLInputElement

		expect(input.checked).toBe(false)

		fireEvent.click(input)

		expect(input.checked).toBe(true)

		expect(input).toHaveAttribute('aria-checked', 'true')

		expect(bySlot(container, 'probe')?.textContent).toBe('true')

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

		const input = bySlot(container, 'switch') as HTMLInputElement

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		// The consumer's handler resolves; the store stays untouched.
		expect(bySlot(container, 'probe')?.textContent).toBe('false')

		expect(onChange).toHaveBeenCalled()
	})
})

describe('Switch size resolution', () => {
	it('inherits size from the Density context when no explicit prop is set', () => {
		const { container } = renderUI(
			<Density scale="lg">
				<Switch />
			</Density>,
		)

		// switchVariants size="lg" brings *:data-[slot=switch-thumb]:size-5.
		expect(bySlot(container, 'control')?.className).toContain('*:data-[slot=switch-thumb]:size-5')
	})

	it('explicit size prop overrides Density inheritance', () => {
		const { container } = renderUI(
			<Density scale="lg">
				<Switch size="sm" />
			</Density>,
		)

		// switchVariants size="sm" brings *:data-[slot=switch-thumb]:size-3.
		expect(bySlot(container, 'control')?.className).toContain('*:data-[slot=switch-thumb]:size-3')
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

		const input = bySlot(container, 'switch') as HTMLElement
		const description = bySlot(container, 'description') as HTMLElement

		expect(description.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', description.id)
	})
})
