import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	CreditCardInput,
	CreditCardInputCvv,
	CreditCardInputExpiry,
	detectCardBrand,
	formatCardNumber,
	formatExpiry,
} from '../../components/credit-card-input'
import { Field, Label } from '../../components/fieldset'
import { Form, useFormField } from '../../components/form'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('CreditCardInput', () => {
	it('renders an input with type text, numeric inputMode, and a credit card icon prefix', () => {
		const { container } = renderUI(<CreditCardInput />)

		const input = bySlot(container, 'credit-card-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'text')

		expect(input).toHaveAttribute('inputmode', 'numeric')

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CreditCardInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<CreditCardInput placeholder="1234 1234 1234 1234" />)

		const input = bySlot(container, 'credit-card-input')

		expect(input).toHaveAttribute('placeholder', '1234 1234 1234 1234')
	})

	it('formats 16-digit card numbers in 4-4-4-4 groups', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onValueChange={onChange} />)

		const input = bySlot(container, 'credit-card-input') as HTMLInputElement

		const user = userEvent.setup()

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

		const input = bySlot(container, 'credit-card-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})

	it('surfaces the detected brand via onBrandChange', async () => {
		const onBrandChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onBrandChange={onBrandChange} />)

		const input = bySlot(container, 'credit-card-input') as HTMLInputElement

		const user = userEvent.setup()

		// Two-digit prefix unambiguously narrows to Visa within the supported
		// brand list; a single '4' is insufficient (multiple brands share that prefix).
		await user.type(input, '42')

		expect(onBrandChange).toHaveBeenLastCalledWith('visa')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<CreditCardInput defaultValue="4242424242424242" />)

		const input = bySlot(container, 'credit-card-input') as HTMLInputElement

		expect(input.value).toBe('4242 4242 4242 4242')
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<CreditCardInput disabled />)

		const input = bySlot(container, 'credit-card-input')

		expect(input).toBeDisabled()
	})
})

describe('CreditCardInputExpiry', () => {
	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CreditCardInputExpiry ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('uses MM/YY as the default placeholder', () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'input')

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

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})

	it('deletes the auto-inserted slash and the preceding digit on backspace', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12')

		expect(input.value).toBe('12/')

		await user.type(input, '{Backspace}')

		expect(input.value).toBe('1')
	})

	it('reports expiry validity to onValidityChange', async () => {
		const onValidityChange = vi.fn()

		const { container } = renderUI(<CreditCardInputExpiry onValidityChange={onValidityChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

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

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '1330')

		expect(onValidityChange).toHaveBeenLastCalledWith(expect.objectContaining({ isValid: false }))
	})

	it('marks a complete impossible expiry invalid while typing', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '1330')

		expect(input.value).toBe('13/30')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('leaves a still-growing entry unmarked while typing', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12')

		expect(input.value).toBe('12/')

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('keeps a partial entry on blur and marks it invalid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12')

		expect(input).not.toHaveAttribute('aria-invalid')

		await user.tab()

		expect(input.value).toBe('12/')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('does not mark an untouched-but-blurred empty field invalid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.click(input)

		await user.tab()

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('renders the default invalid-format message for a complete impossible expiry', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

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

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12')

		await user.tab()

		const message = bySlot(container, 'message')

		expect(message).toBeInTheDocument()

		expect(input.getAttribute('aria-describedby')).toBe(message?.id)
	})

	it('uses a custom invalid message and clears it once valid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry invalidMessage="Bad expiry" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

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

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '1330')

		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(bySlot(container, 'message')).not.toBeInTheDocument()
	})
})

describe('CreditCardInputCvv', () => {
	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CreditCardInputCvv ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('carries a default accessible name (placeholder is not a name)', () => {
		renderUI(<CreditCardInputCvv />)

		expect(screen.getByRole('textbox', { name: 'Security code' })).toBeInTheDocument()
	})

	it.each<[string, 'visa' | 'amex', string, string]>([
		['caps input at 3 digits for non-Amex brands', 'visa', '12345', '123'],
		['allows 4 digits for Amex', 'amex', '12345', '1234'],
		['strips non-digit characters', 'visa', 'ab12c', '12'],
	])('%s', async (_name, brand, typed, expected) => {
		const { container } = renderUI(<CreditCardInputCvv brand={brand} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, typed)

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

		const user = userEvent.setup()

		await user.type(bySlot(container, 'credit-card-input') as HTMLInputElement, '4242424242424242')

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
		function TouchedProbe({ name }: { name: string }) {
			const field = useFormField(name)

			return <span data-testid={`touched-${name}`}>{field?.touched ? 'touched' : 'untouched'}</span>
		}

		const { container } = renderUI(
			<Form defaultValues={{ number: '', expiry: '', cvv: '' }}>
				<CreditCardInput name="number" />
				<CreditCardInputExpiry name="expiry" />
				<CreditCardInputCvv name="cvv" brand="visa" />
				<TouchedProbe name="number" />
				<TouchedProbe name="expiry" />
				<TouchedProbe name="cvv" />
			</Form>,
		)

		const user = userEvent.setup()

		await user.click(bySlot(container, 'credit-card-input') as HTMLInputElement)

		expect(screen.getByTestId('touched-number').textContent).toBe('untouched')

		// Tab number -> expiry -> cvv -> out; each blur touches only its own field.
		await user.tab()

		expect(screen.getByTestId('touched-number').textContent).toBe('touched')

		expect(screen.getByTestId('touched-expiry').textContent).toBe('untouched')

		await user.tab()

		expect(screen.getByTestId('touched-expiry').textContent).toBe('touched')

		expect(screen.getByTestId('touched-cvv').textContent).toBe('untouched')

		await user.tab()

		expect(screen.getByTestId('touched-cvv').textContent).toBe('touched')
	})
})

describe('detectCardBrand', () => {
	it.each<[string, string, string]>([
		['identifies Visa numbers', '4242424242424242', 'visa'],
		['identifies Amex numbers', '378282246310005', 'amex'],
		['identifies Mastercard numbers', '5555555555554444', 'mastercard'],
	])('%s', (_name, number, brand) => {
		expect(detectCardBrand(number)?.brand).toBe(brand)
	})

	it('returns undefined for unknown prefixes', () => {
		expect(detectCardBrand('9999999999999999')).toBeUndefined()
	})
})

describe('formatCardNumber', () => {
	it('splits Visa into 4-4-4-4 groups', () => {
		expect(formatCardNumber('4242424242424242').formatted).toBe('4242 4242 4242 4242')
	})

	it('splits Amex into 4-6-5 groups', () => {
		expect(formatCardNumber('378282246310005').formatted).toBe('3782 822463 10005')
	})
})

describe('formatExpiry', () => {
	it('returns an empty string for empty input', () => {
		expect(formatExpiry('')).toBe('')
	})

	it('passes any single digit through unchanged', () => {
		expect(formatExpiry('0')).toBe('0')

		expect(formatExpiry('1')).toBe('1')

		expect(formatExpiry('5')).toBe('5')
	})

	it('appends a slash after two digits', () => {
		expect(formatExpiry('12')).toBe('12/')
	})

	it('formats four digits as MM/YY', () => {
		expect(formatExpiry('1228')).toBe('12/28')
	})
})
