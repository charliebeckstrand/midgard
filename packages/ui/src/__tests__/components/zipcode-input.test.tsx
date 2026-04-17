import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ZipcodeInput } from '../../components/zipcode-input'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('ZipcodeInput', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<ZipcodeInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ZipcodeInput className="custom" />)

		const input = bySlot(container, 'input')

		expect(input?.className).toContain('custom')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<ZipcodeInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('uses a country-appropriate default placeholder', () => {
		const { container } = renderUI(<ZipcodeInput country="CA" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', 'A1A 1A1')
	})

	it('allows overriding the placeholder', () => {
		const { container } = renderUI(<ZipcodeInput placeholder="ZIP code" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', 'ZIP code')
	})

	it('formats US ZIP+4 with a dash', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<ZipcodeInput onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '941031234')

		expect(input.value).toBe('94103-1234')

		expect(onChange).toHaveBeenLastCalledWith('94103-1234')
	})

	it('strips non-digit characters for US', async () => {
		const { container } = renderUI(<ZipcodeInput />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'abc94103xyz')

		expect(input.value).toBe('94103')
	})

	it('uppercases and spaces Canadian postal codes', async () => {
		const { container } = renderUI(<ZipcodeInput country="CA" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'k1a0b1')

		expect(input.value).toBe('K1A 0B1')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<ZipcodeInput defaultValue="941031234" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toBe('94103-1234')
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<ZipcodeInput disabled />)

		const input = bySlot(container, 'input')

		expect(input).toBeDisabled()
	})
})
