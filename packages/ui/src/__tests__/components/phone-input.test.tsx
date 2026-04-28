import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PhoneInput } from '../../components/phone-input'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('PhoneInput', () => {
	it('renders an input with type tel', () => {
		const { container } = renderUI(<PhoneInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'tel')
	})

	it('renders a phone icon prefix by default', () => {
		const { container } = renderUI(<PhoneInput />)

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<PhoneInput className="custom" />)

		const input = bySlot(container, 'input')

		expect(input?.className).toContain('custom')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<PhoneInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<PhoneInput placeholder="(555) 555-5555" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', '(555) 555-5555')
	})

	it('formats US numbers as the user types', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<PhoneInput onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '5551234567')

		expect(input.value).toBe('(555) 123-4567')

		expect(onChange).toHaveBeenLastCalledWith('(555) 123-4567')
	})

	it('strips non-digit characters for US country', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<PhoneInput onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'abc555')

		expect(input.value).toBe('555')
	})

	it('preserves leading + for international country', async () => {
		const { container } = renderUI(<PhoneInput country="international" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '+14155551234')

		expect(input.value).toBe('+14155551234')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<PhoneInput defaultValue="5551234567" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toBe('(555) 123-4567')
	})

	it('keeps the caret next to the typed digit when format inserts separators', async () => {
		const { container } = renderUI(<PhoneInput defaultValue="5556789" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toBe('555-6789')

		input.focus()

		input.setSelectionRange(2, 2)

		const user = userEvent.setup()

		await user.keyboard('1')

		expect(input.value).toBe('(551) 567-89')

		expect(input.selectionStart).toBe(4)
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<PhoneInput disabled />)

		const input = bySlot(container, 'input')

		expect(input).toBeDisabled()
	})
})
