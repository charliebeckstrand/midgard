import { describe, expect, it, vi } from 'vitest'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { bySlot, renderUI } from '../helpers'

describe('Checkbox', () => {
	it('renders a checkbox input with data-slot="checkbox"', () => {
		const { container } = renderUI(<Checkbox />)
		const input = bySlot(container, 'checkbox')

		expect(input).toBeInTheDocument()
		expect(input?.tagName).toBe('INPUT')
		expect(input).toHaveAttribute('type', 'checkbox')
	})

	it('renders a check icon', () => {
		const { container } = renderUI(<Checkbox />)
		const check = bySlot(container, 'checkbox-check')

		expect(check).toBeInTheDocument()
		expect(check).toHaveAttribute('aria-hidden', 'true')
	})

	it('supports custom icon', () => {
		const { container } = renderUI(<Checkbox icon={<span data-testid="custom-icon">X</span>} />)

		expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument()
		expect(bySlot(container, 'checkbox-check')).not.toBeInTheDocument()
	})

	it('applies custom className to the input', () => {
		const { container } = renderUI(<Checkbox className="my-check" />)
		const input = bySlot(container, 'checkbox')

		expect(input?.className).toContain('my-check')
	})

	it('forwards checked and onChange', () => {
		const onChange = vi.fn()
		const { container } = renderUI(<Checkbox checked={true} onChange={onChange} />)
		const input = bySlot(container, 'checkbox') as HTMLInputElement

		expect(input.checked).toBe(true)
		input.click()
		expect(onChange).toHaveBeenCalled()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Checkbox />, { skeleton: true })

		expect(bySlot(container, 'checkbox')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('CheckboxGroup', () => {
	it('renders a div with data-slot="control"', () => {
		const { container } = renderUI(<CheckboxGroup>items</CheckboxGroup>)
		const group = bySlot(container, 'control')

		expect(group).toBeInTheDocument()
		expect(group?.tagName).toBe('DIV')
	})
})

describe('CheckboxField', () => {
	it('renders a div with data-slot="field"', () => {
		const { container } = renderUI(<CheckboxField>label</CheckboxField>)
		const field = bySlot(container, 'field')

		expect(field).toBeInTheDocument()
		expect(field?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<CheckboxField className="extra">label</CheckboxField>)
		const field = bySlot(container, 'field')

		expect(field?.className).toContain('extra')
	})
})
