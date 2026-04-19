import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CurrencyInput } from '../../components/currency-input'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('CurrencyInput', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<CurrencyInput className="custom" />)

		const input = bySlot(container, 'input')

		expect(input?.className).toContain('custom')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CurrencyInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('uses inputMode="decimal"', () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('inputmode', 'decimal')
	})

	it('formats defaultValue as currency on initial render', () => {
		const { container } = renderUI(<CurrencyInput defaultValue={1234.56} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toBe('$1,234.56')
	})

	it('respects the currency prop', () => {
		const { container } = renderUI(
			<CurrencyInput currency="EUR" locale="en-IE" defaultValue={1000} />,
		)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toContain('1,000')
		expect(input.value).toContain('€')
	})

	it('respects the precision prop', () => {
		const { container } = renderUI(<CurrencyInput precision={4} defaultValue={2.5} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toBe('$2.5000')
	})

	it('shows raw numeric value while focused', async () => {
		const { container } = renderUI(<CurrencyInput defaultValue={1234.5} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		expect(input.value).toBe('1234.5')
	})

	it('reformats and emits the parsed number on blur', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CurrencyInput onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		await user.type(input, '750.5')

		await user.tab()

		expect(onChange).toHaveBeenLastCalledWith(750.5)
		expect(input.value).toBe('$750.50')
	})

	it('emits undefined when cleared', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CurrencyInput defaultValue={50} onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		await user.clear(input)

		await user.tab()

		expect(onChange).toHaveBeenLastCalledWith(undefined)
		expect(input.value).toBe('')
	})

	it('reflects external value changes when not focused', () => {
		const { container, rerender } = renderUI(<CurrencyInput value={10} onChange={() => {}} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toBe('$10.00')

		rerender(<CurrencyInput value={42} onChange={() => {}} />)

		expect(input.value).toBe('$42.00')
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<CurrencyInput disabled />)

		const input = bySlot(container, 'input')

		expect(input).toBeDisabled()
	})
})
