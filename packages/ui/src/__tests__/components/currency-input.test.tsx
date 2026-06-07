import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CurrencyInput } from '../../components/currency-input'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('CurrencyInput', () => {
	it('renders an input with data-slot="currency-input"', () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = bySlot(container, 'currency-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CurrencyInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('uses inputMode="decimal"', () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = bySlot(container, 'currency-input')

		expect(input).toHaveAttribute('inputmode', 'decimal')
	})

	it('renders the currency symbol as a prefix alongside the grouped value', () => {
		const { container } = renderUI(<CurrencyInput defaultValue={1234.56} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		expect(input.value).toBe('1,234.56')
		expect(container.textContent).toContain('$')
	})

	it('respects the currency prop', () => {
		const { container } = renderUI(
			<CurrencyInput currency="EUR" locale="en-IE" defaultValue={1000} />,
		)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		expect(input.value).toBe('1,000.00')
		expect(container.textContent).toContain('€')
	})

	it('respects the precision prop', () => {
		const { container } = renderUI(<CurrencyInput precision={4} defaultValue={2.5} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		expect(input.value).toBe('2.5000')
	})

	it('preserves grouping while editing', async () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		await user.type(input, '1234567')

		expect(input.value).toBe('1,234,567')

		await user.type(input, '.89')

		expect(input.value).toBe('1,234,567.89')
	})

	it('keeps grouping when focusing a prefilled value', async () => {
		const { container } = renderUI(<CurrencyInput defaultValue={1234.5} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		expect(input.value).toBe('1,234.50')
	})

	it('reformats and emits the parsed number on blur', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CurrencyInput onValueChange={onChange} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		await user.type(input, '750.5')

		await user.tab()

		expect(onChange).toHaveBeenLastCalledWith(750.5)
		expect(input.value).toBe('750.50')
	})

	it('emits undefined when cleared', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CurrencyInput defaultValue={50} onValueChange={onChange} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		await user.clear(input)

		await user.tab()

		expect(onChange).toHaveBeenLastCalledWith(undefined)
		expect(input.value).toBe('')
	})

	it('reflects external value changes when not focused', () => {
		const { container, rerender } = renderUI(<CurrencyInput value={10} onValueChange={() => {}} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		expect(input.value).toBe('10.00')

		rerender(<CurrencyInput value={42} onValueChange={() => {}} />)

		expect(input.value).toBe('42.00')
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<CurrencyInput disabled />)

		const input = bySlot(container, 'currency-input')

		expect(input).toBeDisabled()
	})

	it('blurs the input when Enter is pressed', async () => {
		const { container } = renderUI(<CurrencyInput defaultValue={10} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		const user = userEvent.setup()

		input.focus()

		expect(document.activeElement).toBe(input)

		await user.keyboard('{Enter}')

		expect(document.activeElement).not.toBe(input)
	})

	it('does not blur the input when the consumer prevents default on Enter', async () => {
		const onKeyDown = vi.fn((e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') e.preventDefault()
		})

		const { container } = renderUI(<CurrencyInput defaultValue={10} onKeyDown={onKeyDown} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		const user = userEvent.setup()

		input.focus()

		await user.keyboard('{Enter}')

		expect(document.activeElement).toBe(input)
	})

	it('forwards onValueChange and onBlur after edits round-trip through the input', async () => {
		const onBlur = vi.fn()

		const { container } = renderUI(<CurrencyInput defaultValue={10} onBlur={onBlur} />)

		const input = bySlot(container, 'currency-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		await user.type(input, '5')

		await user.tab()

		expect(onBlur).toHaveBeenCalled()
	})

	it('accepts a callback ref alongside the controlled value', () => {
		const refCb = vi.fn()

		renderUI(<CurrencyInput ref={refCb} value={5} onValueChange={() => {}} />)

		expect(refCb).toHaveBeenCalledWith(expect.any(HTMLInputElement))
	})
})
