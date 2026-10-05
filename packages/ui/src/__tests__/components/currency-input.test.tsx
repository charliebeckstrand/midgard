import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CurrencyInput } from '../../components/currency-input'
import { Form } from '../../components/form'
import { fireEvent, getSlot, renderUI, screen, setupUser } from '../helpers'

describe('CurrencyInput', () => {
	it('merges a consumer className with its own tabular-nums', () => {
		const { container } = renderUI(<CurrencyInput className="w-full" />)

		const input = getSlot(container, 'currency-input')

		expect(input).toHaveClass('w-full')

		expect(input).toHaveClass('tabular-nums')
	})

	it('renders an input with data-slot="currency-input" and inputMode="decimal"', () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = getSlot(container, 'currency-input')

		expect(input.tagName).toBe('INPUT')

		expect(input).toHaveAttribute('inputmode', 'decimal')
	})

	it('renders the currency symbol as a prefix alongside the grouped value', () => {
		const { container } = renderUI(<CurrencyInput defaultValue={1234.56} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		expect(input.value).toBe('1,234.56')

		expect(container.textContent).toContain('$')
	})

	// Focus mode does not read affix text, so the symbol describes the input.
	it('ties the currency symbol to the input as a description', () => {
		renderUI(
			<>
				<CurrencyInput aria-label="Amount" defaultValue={5} aria-describedby="amount-hint" />
				<p id="amount-hint">Up to 100</p>
			</>,
		)

		expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveAccessibleDescription(
			'$ Up to 100',
		)
	})

	it('describes the input by no symbol when the caller replaces its slot', () => {
		renderUI(<CurrencyInput aria-label="Amount" prefix="USD" />)

		expect(screen.getByRole('textbox', { name: 'Amount' })).not.toHaveAttribute('aria-describedby')
	})

	it('respects the currency prop', () => {
		const { container } = renderUI(
			<CurrencyInput currency="EUR" locale="en-IE" defaultValue={1000} />,
		)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		expect(input.value).toBe('1,000.00')

		expect(container.textContent).toContain('€')
	})

	it('respects the precision prop', () => {
		const { container } = renderUI(<CurrencyInput precision={4} defaultValue={2.5} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		expect(input.value).toBe('2.5000')
	})

	it('preserves grouping while editing', async () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.type(input, '1234567')

		expect(input.value).toBe('1,234,567')

		await user.type(input, '.89')

		expect(input.value).toBe('1,234,567.89')
	})

	it('keeps grouping when focusing a prefilled value', async () => {
		const { container } = renderUI(<CurrencyInput defaultValue={1234.5} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		expect(input.value).toBe('1,234.50')
	})

	it('keeps the caret next to the typed digit when grouping separators shift', async () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.type(input, '123456')

		expect(input.value).toBe('123,456')

		input.setSelectionRange(3, 3)

		await user.keyboard('9')

		// Reformatting inserts a new separator before the typed digit; the caret
		// stays anchored after the 9 instead of being pushed to the end.
		expect(input.value).toBe('1,239,456')

		expect(input.selectionStart).toBe(5)
	})

	it('keeps the caret in place when the format drops a minus sign after the start', async () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.type(input, '123')

		input.setSelectionRange(1, 1)

		await user.keyboard('-')

		// The format keeps only a leading sign, so this sign goes and the caret
		// stays after the 1.
		expect(input.value).toBe('123')

		expect(input.selectionStart).toBe(1)

		await user.keyboard('9')

		expect(input.value).toBe('1,923')
	})

	it('keeps the caret after a minus sign typed at the start', async () => {
		const { container } = renderUI(<CurrencyInput />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.type(input, '123')

		input.setSelectionRange(0, 0)

		await user.keyboard('-')

		expect(input.value).toBe('-123')

		expect(input.selectionStart).toBe(1)
	})

	it('reformats and emits the parsed number on blur', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CurrencyInput onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.type(input, '750.5')

		await user.tab()

		expect(onChange).toHaveBeenLastCalledWith(750.5)

		expect(input.value).toBe('750.50')
	})

	it('reads a leading decimal as a fraction, not an integer', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CurrencyInput onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.type(input, '.5')

		// `.5` is 0.5, not 5: the padded leading `0` must not steal the caret and
		// push the next digit into the integer part.
		expect(onChange).toHaveBeenLastCalledWith(0.5)

		expect(input.value).toBe('0.5')
	})

	it('emits null when cleared', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CurrencyInput defaultValue={50} onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.clear(input)

		await user.tab()

		expect(onChange).toHaveBeenLastCalledWith(null)

		expect(input.value).toBe('')
	})

	it('reflects external value changes when not focused', () => {
		const { container, rerender } = renderUI(<CurrencyInput value={10} onValueChange={() => {}} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		expect(input.value).toBe('10.00')

		rerender(<CurrencyInput value={42} onValueChange={() => {}} />)

		expect(input.value).toBe('42.00')
	})

	it('blurs the input when Enter is pressed', async () => {
		const { container } = renderUI(<CurrencyInput defaultValue={10} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		input.focus()

		expect(document.activeElement).toBe(input)

		await user.keyboard('{Enter}')

		expect(document.activeElement).not.toBe(input)
	})

	it('keeps focus on an Enter that confirms an input-method candidate', () => {
		const { container } = renderUI(<CurrencyInput defaultValue={10} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		input.focus()

		fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })

		expect(document.activeElement).toBe(input)

		fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

		expect(document.activeElement).toBe(input)
	})

	it('does not blur the input when the consumer prevents default on Enter', async () => {
		const onKeyDown = vi.fn((e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') e.preventDefault()
		})

		const { container } = renderUI(<CurrencyInput defaultValue={10} onKeyDown={onKeyDown} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		input.focus()

		await user.keyboard('{Enter}')

		expect(document.activeElement).toBe(input)
	})

	it('forwards onBlur after an edit round-trips through the input', async () => {
		const onBlur = vi.fn()

		const { container } = renderUI(<CurrencyInput defaultValue={10} onBlur={onBlur} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.type(input, '5')

		await user.tab()

		expect(onBlur).toHaveBeenCalled()
	})

	it('keeps the formatting under a stray onChange', async () => {
		// A stray `onChange` that a cast lets past the props type. The formatting
		// `onChange` sits after the spread, so the stray one does not replace it
		// (CONVENTIONS.md §3.9).
		const stray = { onChange: vi.fn() } as object

		const onValueChange = vi.fn()

		const { container } = renderUI(<CurrencyInput {...stray} onValueChange={onValueChange} />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		await setupUser().type(input, '1234')

		expect(input.value).toBe('1,234')

		expect(onValueChange).toHaveBeenLastCalledWith(1234)
	})

	it('shows a value from outside while the field has focus', async () => {
		const onValueChange = vi.fn()

		const { container, rerender } = renderUI(
			<CurrencyInput value={10} onValueChange={onValueChange} />,
		)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.type(input, '5')

		rerender(<CurrencyInput value={42} onValueChange={onValueChange} />)

		expect(input).toHaveFocus()

		expect(input.value).toBe('42.00')
	})

	it('keeps the typed text while the value follows each keystroke', async () => {
		function Controlled() {
			const [value, setValue] = useState<number | null>(null)

			return <CurrencyInput value={value} onValueChange={setValue} />
		}

		const { container } = renderUI(<Controlled />)

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		const user = setupUser()

		await user.click(input)

		await user.type(input, '12.')

		expect(input.value).toBe('12.')

		await user.clear(input)

		expect(input.value).toBe('')
	})

	it('accepts a callback ref alongside the controlled value', () => {
		const refCb = vi.fn()

		renderUI(<CurrencyInput ref={refCb} value={5} onValueChange={() => {}} />)

		expect(refCb).toHaveBeenCalledWith(expect.any(HTMLInputElement))
	})

	it('binds to a Form field by name, storing the parsed number', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ price: undefined }} onSubmit={onSubmit}>
				<CurrencyInput name="price" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = setupUser()

		const input = getSlot<HTMLInputElement>(container, 'currency-input')

		await user.type(input, '1234.5')

		expect(input.value).toBe('1,234.5')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ price: 1234.5 }),
			expect.anything(),
		)
	})
})
