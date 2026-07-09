import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox, CheckboxField, CheckboxGroup, CheckboxSkeleton } from '../../components/checkbox'
import { Description } from '../../components/fieldset'
import { Form, useFormField } from '../../components/form'
import { Density } from '../../primitives/density'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

function FieldProbe({ name }: { name: string }) {
	const field = useFormField(name)

	return <output data-slot="probe">{String(field?.value)}</output>
}

describe('Checkbox', () => {
	it('renders a checkbox input with data-slot="checkbox" and a check icon', () => {
		const { container } = renderUI(<Checkbox />)

		const input = bySlot(container, 'checkbox')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(input).toHaveAttribute('type', 'checkbox')

		const check = bySlot(container, 'checkbox-check')

		expect(check).toBeInTheDocument()

		expect(check).toHaveAttribute('aria-hidden', 'true')
	})

	it('supports custom icon', () => {
		const { container } = renderUI(<Checkbox icon={<span data-testid="custom-icon">X</span>} />)

		expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument()

		expect(bySlot(container, 'checkbox-check')).not.toBeInTheDocument()
	})

	it('forwards checked and onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Checkbox checked={true} onChange={onChange} />)

		const input = bySlot(container, 'checkbox') as HTMLInputElement

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		expect(onChange).toHaveBeenCalled()
	})

	it('pairs with an explicit CheckboxSkeleton in loading trees', () => {
		const { container } = renderUI(<CheckboxSkeleton />)

		expect(bySlot(container, 'checkbox')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('forwards a createRef to the input element', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<Checkbox ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('forwards a callback ref to the input element', () => {
		const refFn = vi.fn()

		renderUI(<Checkbox ref={refFn} />)

		expect(refFn).toHaveBeenCalledWith(expect.any(HTMLInputElement))
	})

	it('sets the indeterminate flag on the input element when indeterminate is true', () => {
		const { container } = renderUI(<Checkbox indeterminate />)

		const input = bySlot(container, 'checkbox') as HTMLInputElement

		expect(input.indeterminate).toBe(true)
	})
})

describe('Checkbox in a Form', () => {
	it('binds checked to the form field by name and chains onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ agree: false }}>
				<Checkbox name="agree" onChange={onChange} />
				<FieldProbe name="agree" />
			</Form>,
		)

		const input = bySlot(container, 'checkbox') as HTMLInputElement

		expect(input.checked).toBe(false)

		fireEvent.click(input)

		expect(input.checked).toBe(true)

		expect(bySlot(container, 'probe')?.textContent).toBe('true')

		expect(onChange).toHaveBeenCalled()
	})

	it('lets an explicit checked prop win over the form binding', () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ agree: false }}>
				<Checkbox name="agree" checked onChange={onChange} />
				<FieldProbe name="agree" />
			</Form>,
		)

		const input = bySlot(container, 'checkbox') as HTMLInputElement

		expect(input.checked).toBe(true)

		fireEvent.click(input)

		// The consumer's handler resolves; the store stays untouched.
		expect(bySlot(container, 'probe')?.textContent).toBe('false')

		expect(onChange).toHaveBeenCalled()
	})
})

describe('CheckboxGroup', () => {
	it('exposes role="group" and accepts an accessible name', () => {
		renderUI(<CheckboxGroup aria-label="Notifications">items</CheckboxGroup>)

		expect(screen.getByRole('group', { name: 'Notifications' })).toBeInTheDocument()
	})
})

describe('Checkbox size', () => {
	it('defaults to md (size-5)', () => {
		const { container } = renderUI(<Checkbox />)

		const label = bySlot(container, 'control')

		expect(label?.className).toContain('size-5')
	})

	it('reflects an explicit size prop', () => {
		const { container } = renderUI(<Checkbox size="lg" />)

		expect(bySlot(container, 'control')?.className).toContain('size-5')
	})

	it('inherits size from the Density context', () => {
		const { container } = renderUI(
			<Density scale="sm">
				<Checkbox />
			</Density>,
		)

		expect(bySlot(container, 'control')?.className).toContain('size-4')
	})

	it('explicit size beats Density inheritance', () => {
		const { container } = renderUI(
			<Density scale="sm">
				<Checkbox size="lg" />
			</Density>,
		)

		expect(bySlot(container, 'control')?.className).toContain('size-5')
	})

	it('check icon scales with size', () => {
		const { container } = renderUI(<Checkbox size="lg" />)

		// The check is an SVG element; SVGAnimatedString.baseVal is the readable form.
		expect(bySlot(container, 'checkbox-check')?.getAttribute('class')).toContain('size-4')
	})
})

describe('CheckboxField aria-describedby', () => {
	it('points the checkbox at a rendered Description', () => {
		const { container } = renderUI(
			<CheckboxField>
				<Checkbox />
				<Description>Subscribe to product updates.</Description>
			</CheckboxField>,
		)

		const input = bySlot(container, 'checkbox') as HTMLElement

		const description = bySlot(container, 'description') as HTMLElement

		expect(description.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', description.id)
	})
})
