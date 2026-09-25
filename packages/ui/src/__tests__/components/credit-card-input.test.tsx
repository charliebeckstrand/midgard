import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	CreditCardInput,
	CreditCardInputCvv,
	CreditCardInputExpiry,
} from '../../components/credit-card-input'
import { Field, Label } from '../../components/fieldset'
import { Form } from '../../components/form'
import { bySlot, getSlot, renderUI, screen, userEvent } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('CreditCardInput', () => {
	it('renders an input with type text, numeric inputMode, and a credit card icon prefix', () => {
		const { container } = renderUI(<CreditCardInput />)

		const input = bySlot(container, 'credit-card-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'text')

		expect(input).toHaveAttribute('inputmode', 'numeric')

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('formats 16-digit card numbers in 4-4-4-4 groups', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '4242424242424242')

		expect(input.value).toBe('4242 4242 4242 4242')

		expect(onChange).toHaveBeenLastCalledWith('4242 4242 4242 4242')
	})

	it.each<[string, string, string]>([
		['formats Amex numbers in 4-6-5 groups', '378282246310005', '3782 822463 10005'],
		['strips non-digit characters', 'abc4242', '4242'],
		['caps length at the max for the detected brand', '37828224631000599', '3782 822463 10005'],
	])('%s', async (_name, typed, expected) => {
		const { container } = renderUI(<CreditCardInput />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		const user = userEvent.setup({ delay: null })

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})

	it('surfaces the detected brand via onBrandChange', async () => {
		const onBrandChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onBrandChange={onBrandChange} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		const user = userEvent.setup({ delay: null })

		// Two-digit prefix unambiguously narrows to Visa within the supported
		// brand list; a single '4' is insufficient (multiple brands share that prefix).
		await user.type(input, '42')

		expect(onBrandChange).toHaveBeenLastCalledWith('visa')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<CreditCardInput defaultValue="4242424242424242" />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		expect(input.value).toBe('4242 4242 4242 4242')
	})
})

describe('CreditCardInputExpiry', () => {
	it('uses MM/YY as the default placeholder', () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'credit-card-input-expiry')

		expect(input).toHaveAttribute('placeholder', 'MM/YY')
	})

	it('carries a default accessible name (placeholder is not a name)', () => {
		renderUI(<CreditCardInputExpiry />)

		expect(screen.getByRole('textbox', { name: 'Expiration date' })).toBeInTheDocument()
	})

	it('yields the default name to a Field label', () => {
		renderUI(
			<Field>
				<Label>Card expiry</Label>
				<CreditCardInputExpiry />
			</Field>,
		)

		expect(screen.getByRole('textbox', { name: 'Card expiry' })).toBeInTheDocument()
	})

	it.each<[string, string, string]>([
		['inserts a slash after the month digits', '1228', '12/28'],
		['leaves a single digit unchanged until a second digit is typed', '5', '5'],
		['strips non-digit characters', 'ab12cd25', '12/25'],
	])('%s', async (_name, typed, expected) => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})

	it('deletes the auto-inserted slash and the preceding digit on backspace', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '12')

		expect(input.value).toBe('12/')

		await user.type(input, '{Backspace}')

		expect(input.value).toBe('1')
	})

	it('reports expiry validity to onValidityChange', async () => {
		const onValidityChange = vi.fn()

		const { container } = renderUI(<CreditCardInputExpiry onValidityChange={onValidityChange} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		const yy = String((new Date().getFullYear() + 2) % 100).padStart(2, '0')

		await user.type(input, `12${yy}`)

		expect(input.value).toBe(`12/${yy}`)

		expect(onValidityChange).toHaveBeenLastCalledWith({
			isValid: true,
			isPotentiallyValid: true,
		})
	})

	it('rejects an out-of-range month through onValidityChange', async () => {
		const onValidityChange = vi.fn()

		const { container } = renderUI(<CreditCardInputExpiry onValidityChange={onValidityChange} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '1330')

		expect(onValidityChange).toHaveBeenLastCalledWith(expect.objectContaining({ isValid: false }))
	})

	it('marks a complete impossible expiry invalid while typing', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '1330')

		expect(input.value).toBe('13/30')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('leaves a still-growing entry unmarked while typing', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '12')

		expect(input.value).toBe('12/')

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('keeps a partial entry on blur and marks it invalid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '12')

		expect(input).not.toHaveAttribute('aria-invalid')

		await user.tab()

		expect(input.value).toBe('12/')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('does not mark an untouched-but-blurred empty field invalid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.click(input)

		await user.tab()

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('renders the default invalid-format message for a complete impossible expiry', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		expect(bySlot(container, 'message')).not.toBeInTheDocument()

		await user.type(input, '1330')

		const message = bySlot(container, 'message')

		expect(message).toBeInTheDocument()

		expect(message).toHaveAttribute('role', 'alert')

		expect(message).toHaveTextContent('Enter a valid expiration date (MM/YY)')
	})

	it('renders the message on blur for a partial entry and wires aria-describedby', async () => {
		const { container } = renderUI(
			<Field>
				<Label>Expiry</Label>
				<CreditCardInputExpiry />
			</Field>,
		)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '12')

		await user.tab()

		const message = bySlot(container, 'message')

		expect(message).toBeInTheDocument()

		expect(input.getAttribute('aria-describedby')).toBe(message?.id)
	})

	it('uses a custom invalid message and clears it once valid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry invalidMessage="Bad expiry" />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '1330')

		expect(bySlot(container, 'message')).toHaveTextContent('Bad expiry')

		const yy = String((new Date().getFullYear() + 2) % 100).padStart(2, '0')

		await user.clear(input)

		await user.type(input, `12${yy}`)

		expect(bySlot(container, 'message')).not.toBeInTheDocument()

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('suppresses the built-in message when invalidMessage is null', async () => {
		const { container } = renderUI(<CreditCardInputExpiry invalidMessage={null} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = userEvent.setup({ delay: null })

		await user.type(input, '1330')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(bySlot(container, 'message')).not.toBeInTheDocument()
	})
})

describe('CreditCardInputCvv', () => {
	it('carries a default accessible name (placeholder is not a name)', () => {
		renderUI(<CreditCardInputCvv />)

		expect(screen.getByRole('textbox', { name: 'Security code' })).toBeInTheDocument()
	})

	it('reports the length verdict while the entry grows', async () => {
		const verdicts: boolean[] = []

		const { container } = renderUI(
			<CreditCardInputCvv brand="visa" onValidityChange={(v) => verdicts.push(v.isValid)} />,
		)

		await userEvent
			.setup({ delay: null })
			.type(getSlot<HTMLInputElement>(container, 'credit-card-input-cvv'), '123')

		// Length is a CVV's only rule, so the verdict flips exactly at the cap.
		expect(verdicts).toEqual([false, false, true])
	})

	it('re-measures the entry when a brand change shrinks the length', async () => {
		const { container, rerender } = renderUI(<CreditCardInputCvv brand="amex" />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-cvv')

		await userEvent.setup({ delay: null }).type(input, '1234')

		rerender(<CreditCardInputCvv brand="visa" />)

		// Visa caps at three, so the stored value truncates and stays complete.
		expect(input).toHaveValue('123')

		expect(bySlot(container, 'message')).not.toBeInTheDocument()
	})

	it.each<[string, 'visa' | 'amex', string, string]>([
		['caps input at 3 digits for non-Amex brands', 'visa', '12345', '123'],
		['allows 4 digits for Amex', 'amex', '12345', '1234'],
		['strips non-digit characters', 'visa', 'ab12c', '12'],
	])('%s', async (_name, brand, typed, expected) => {
		const { container } = renderUI(<CreditCardInputCvv brand={brand} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-cvv')

		const user = userEvent.setup({ delay: null })

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})
})

describe('Credit card masking', () => {
	// A stray `onChange` that a cast lets past the props type. The masking
	// `onChange` sits after the spread, so the stray one does not replace it
	// (CONVENTIONS.md §3.9).
	const stray = { onChange: vi.fn() } as object

	it.each<[string, () => ReactElement, string, string]>([
		['credit-card-input', () => <CreditCardInput {...stray} />, '42424242', '4242 4242'],
		['credit-card-input-expiry', () => <CreditCardInputExpiry {...stray} />, '1225', '12/25'],
		['credit-card-input-cvv', () => <CreditCardInputCvv {...stray} />, '1a23', '123'],
	])('keeps the %s masking under a stray onChange', async (slot, render, typed, expected) => {
		const { container } = renderUI(render())

		const input = getSlot<HTMLInputElement>(container, slot)

		await userEvent.setup({ delay: null }).type(input, typed)

		expect(input.value).toBe(expected)
	})
})

describe('Credit card trio + Form', () => {
	it('binds number, expiry, and CVV to their own Form fields, storing the formatted text', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ number: '', expiry: '', cvv: '' }} onSubmit={onSubmit}>
				<CreditCardInput name="number" />
				<CreditCardInputExpiry name="expiry" />
				<CreditCardInputCvv name="cvv" brand="visa" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const user = userEvent.setup({ delay: null })

		await user.type(getSlot<HTMLInputElement>(container, 'credit-card-input'), '4242424242424242')

		await user.type(screen.getByRole('textbox', { name: 'Expiration date' }), '1228')

		await user.type(screen.getByRole('textbox', { name: 'Security code' }), '123')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				number: '4242 4242 4242 4242',
				expiry: '12/28',
				cvv: '123',
			}),
			expect.anything(),
		)
	})

	it('marks each form field touched on its own blur', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ number: '', expiry: '', cvv: '' }}>
				<CreditCardInput name="number" />
				<CreditCardInputExpiry name="expiry" />
				<CreditCardInputCvv name="cvv" brand="visa" />
				<FieldProbe name="number" />
				<FieldProbe name="expiry" />
				<FieldProbe name="cvv" />
			</Form>,
		)

		const user = userEvent.setup({ delay: null })

		await user.click(getSlot<HTMLInputElement>(container, 'credit-card-input'))

		expect(getFieldProbe('number')).toHaveAttribute('data-touched', 'false')

		// Tab number -> expiry -> cvv -> out; each blur touches only its own field.
		await user.tab()

		expect(getFieldProbe('number')).toHaveAttribute('data-touched', 'true')

		expect(getFieldProbe('expiry')).toHaveAttribute('data-touched', 'false')

		await user.tab()

		expect(getFieldProbe('expiry')).toHaveAttribute('data-touched', 'true')

		expect(getFieldProbe('cvv')).toHaveAttribute('data-touched', 'false')

		await user.tab()

		expect(getFieldProbe('cvv')).toHaveAttribute('data-touched', 'true')
	})
})
