import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PhoneInput } from '../../components/phone-input'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('PhoneInput', () => {
	it('renders an input with type tel', () => {
		const { container } = renderUI(<PhoneInput />)

		const input = bySlot(container, 'phone-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'tel')
	})

	it('renders a phone icon prefix by default', () => {
		const { container } = renderUI(<PhoneInput />)

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<PhoneInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<PhoneInput placeholder="(555) 555-5555" />)

		const input = bySlot(container, 'phone-input')

		expect(input).toHaveAttribute('placeholder', '(555) 555-5555')
	})

	it('formats US numbers as the user types', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<PhoneInput onValueChange={onChange} />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '5551234567')

		expect(input.value).toBe('(555) 123-4567')

		expect(onChange).toHaveBeenLastCalledWith('(555) 123-4567')
	})

	it('strips non-digit characters for US country', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<PhoneInput onValueChange={onChange} />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'abc555')

		expect(input.value).toBe('555')
	})

	it('preserves leading + for international country', async () => {
		const { container } = renderUI(<PhoneInput country="international" />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '+14155551234')

		expect(input.value).toBe('+14155551234')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<PhoneInput defaultValue="5551234567" />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		expect(input.value).toBe('(555) 123-4567')
	})

	it('keeps the caret next to the typed digit when format inserts separators', async () => {
		const { container } = renderUI(<PhoneInput defaultValue="5556789" />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

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

		const input = bySlot(container, 'phone-input')

		expect(input).toBeDisabled()
	})

	it('renders a custom prefix in place of the default phone icon', () => {
		const { container } = renderUI(
			<PhoneInput prefix={<span data-testid="custom-prefix">PHN</span>} />,
		)

		expect(container.querySelector('[data-testid="custom-prefix"]')).toBeInTheDocument()
	})

	it('strips a leading country-code 1 from an 11-digit US number', () => {
		const { container } = renderUI(<PhoneInput defaultValue="15551234567" />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		expect(input.value).toBe('(555) 123-4567')
	})

	it('preserves a leading + with no digits for international country', async () => {
		const { container } = renderUI(<PhoneInput country="international" />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '+')

		expect(input.value).toBe('+')
	})

	it('formats digits without a + for international country', () => {
		const { container } = renderUI(
			<PhoneInput country="international" defaultValue="14155551234" />,
		)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		expect(input.value).toBe('14155551234')
	})

	it('renders an empty string for an empty US value', () => {
		const { container } = renderUI(<PhoneInput defaultValue="" />)

		const input = bySlot(container, 'phone-input') as HTMLInputElement

		expect(input.value).toBe('')
	})
})
