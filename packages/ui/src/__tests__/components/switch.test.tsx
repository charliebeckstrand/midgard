import { describe, expect, it, vi } from 'vitest'
import { Concentric } from '../../components/concentric/component'
import { Switch, SwitchField } from '../../components/switch'
import { bySlot, renderUI } from '../helpers'

describe('Switch', () => {
	it('renders a checkbox input with data-slot="switch"', () => {
		const { container } = renderUI(<Switch />)

		const input = bySlot(container, 'switch')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(input).toHaveAttribute('type', 'checkbox')
	})

	it('renders a thumb element', () => {
		const { container } = renderUI(<Switch />)

		const thumb = bySlot(container, 'switch-thumb')

		expect(thumb).toBeInTheDocument()

		expect(thumb).toHaveAttribute('aria-hidden', 'true')
	})

	it('applies custom className to the wrapper', () => {
		const { container } = renderUI(<Switch className="custom" />)

		const wrapper = bySlot(container, 'control')

		expect(wrapper?.className).toContain('custom')
	})

	it('forwards checked and onChange', () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Switch checked={true} onChange={onChange} />)

		const input = bySlot(container, 'switch') as HTMLInputElement

		expect(input.checked).toBe(true)

		input.click()

		expect(onChange).toHaveBeenCalled()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Switch />, { skeleton: true })

		expect(bySlot(container, 'switch')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('SwitchField', () => {
	it('renders a div with data-slot="field"', () => {
		const { container } = renderUI(<SwitchField>content</SwitchField>)

		const field = bySlot(container, 'field')

		expect(field).toBeInTheDocument()

		expect(field?.tagName).toBe('DIV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<SwitchField className="extra">content</SwitchField>)

		const field = bySlot(container, 'field')

		expect(field?.className).toContain('extra')
	})
})

describe('Switch size resolution', () => {
	it('inherits size from <Concentric> when no explicit prop is set', () => {
		const { container } = renderUI(
			<Concentric size="lg">
				<Switch />
			</Concentric>,
		)

		// switchVariants size="lg" brings *:data-[slot=switch-thumb]:size-5.
		expect(bySlot(container, 'control')?.className).toContain('*:data-[slot=switch-thumb]:size-5')
	})

	it('explicit size prop overrides <Concentric> inheritance', () => {
		const { container } = renderUI(
			<Concentric size="lg">
				<Switch size="sm" />
			</Concentric>,
		)

		// switchVariants size="sm" brings *:data-[slot=switch-thumb]:size-3.
		expect(bySlot(container, 'control')?.className).toContain('*:data-[slot=switch-thumb]:size-3')
	})
})
