import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { Button } from '../../components/button'
import {
	CreditCardInput,
	CreditCardInputCvv,
	CreditCardInputExpiry,
} from '../../components/credit-card-input'
import { validateCardExpiry } from '../../components/credit-card-input/credit-card-input-utilities'
import { Field, Label, Message } from '../../components/fieldset'
import { Form } from '../../components/form'
import {
	act,
	allBySlot,
	attach,
	bySlot,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	setupUser,
	userEvent,
} from '../helpers'
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

	it('keeps a null value controlled and empty (§7.3)', async () => {
		const { container } = renderUI(<CreditCardInput value={null} onValueChange={() => {}} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		const user = setupUser()

		await user.type(input, '42')

		expect(input.value).toBe('')
	})

	it('formats 16-digit card numbers in 4-4-4-4 groups', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onValueChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		const user = setupUser()

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

		const user = setupUser()

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})

	it('surfaces the detected brand via onBrandChange', async () => {
		const onBrandChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onBrandChange={onBrandChange} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input')

		const user = setupUser()

		// Two-digit prefix unambiguously narrows to Visa within the supported
		// brand list; a single '4' is insufficient (multiple brands share that prefix).
		await user.type(input, '42')

		expect(onBrandChange).toHaveBeenLastCalledWith('visa')
	})

	// Focus mode does not read affix text, so the brand describes the input.
	it('ties the detected brand to the input as a description', async () => {
		renderUI(<CreditCardInput aria-label="Card number" />)

		const input = screen.getByRole('textbox', { name: 'Card number' })

		expect(input).not.toHaveAttribute('aria-describedby')

		await setupUser().type(input, '4242')

		expect(input).toHaveAccessibleDescription('Visa')
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

		const user = setupUser()

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})

	it('deletes the auto-inserted slash and the preceding digit on backspace', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '12')

		expect(input.value).toBe('12/')

		await user.type(input, '{Backspace}')

		expect(input.value).toBe('1')
	})

	it('pads a one-digit month that a typed slash follows and keeps the caret after it', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		await setupUser().type(input, '4/27')

		expect(input.value).toBe('04/27')

		expect(input.selectionStart).toBe(5)
	})

	it('pads a one-digit month in a pasted expiry and puts the caret at the end', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.click(input)

		await user.paste('1/27')

		expect(input.value).toBe('01/27')

		expect(input.selectionStart).toBe(5)
	})

	it('deletes the month digit before the caret on backspace, with no pad', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '12')

		input.setSelectionRange(2, 2)

		await user.keyboard('{Backspace}')

		expect(input.value).toBe('1')

		expect(input.selectionStart).toBe(1)

		await user.keyboard('{Backspace}')

		expect(input.value).toBe('')
	})

	it.each<
		[string, (user: ReturnType<typeof setupUser>, input: HTMLInputElement) => Promise<unknown>]
	>([
		['a forward delete', (user) => user.keyboard('{Delete}')],
		[
			'a cut',
			(user, input) => {
				input.setSelectionRange(2, 3)

				return user.cut()
			},
		],
	])('keeps the month digits when %s removes the slash', async (_name, remove) => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '12')

		input.setSelectionRange(2, 2)

		await remove(user, input)

		expect(input.value).toBe('12/')
	})

	it('reports expiry validity to onValidityChange', async () => {
		const onValidityChange = vi.fn()

		const { container } = renderUI(<CreditCardInputExpiry onValidityChange={onValidityChange} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

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

		const user = setupUser()

		await user.type(input, '1330')

		expect(onValidityChange).toHaveBeenLastCalledWith(expect.objectContaining({ isValid: false }))
	})

	it('marks a complete impossible expiry invalid while typing', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '1330')

		expect(input.value).toBe('13/30')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('keeps a partial entry on blur and marks it invalid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '12')

		expect(input).not.toHaveAttribute('aria-invalid')

		await user.tab()

		expect(input.value).toBe('12/')

		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('does not mark an untouched-but-blurred empty field invalid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.click(input)

		await user.tab()

		expect(input).not.toHaveAttribute('aria-invalid')
	})

	it('renders the default invalid-format message for a complete impossible expiry', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

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

		const user = setupUser()

		await user.type(input, '12')

		await user.tab()

		const message = bySlot(container, 'message')

		expect(message).toBeInTheDocument()

		expect(input.getAttribute('aria-describedby')).toBe(message?.id)
	})

	it('describes the input by the built-in message outside a Field', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '1330')

		expect(input).toHaveAccessibleDescription('Enter a valid expiration date (MM/YY)')
	})

	it('keeps a caller aria-describedby ahead of the built-in message', async () => {
		const { container } = renderUI(
			<>
				<p id="expiry-hint">As printed on the card</p>

				<CreditCardInputExpiry aria-describedby="expiry-hint" />
			</>,
		)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '1330')

		expect(input).toHaveAccessibleDescription(
			'As printed on the card Enter a valid expiration date (MM/YY)',
		)
	})

	it('gives the built-in message an id apart from another error Message in the Field', async () => {
		const { container } = renderUI(
			<Field>
				<Label>Expiry</Label>

				<CreditCardInputExpiry />

				<Message>Card declined</Message>
			</Field>,
		)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '1330')

		const messages = allBySlot(container, 'message')

		expect(messages).toHaveLength(2)

		const [builtIn, other] = messages

		expect(builtIn?.id).not.toBe(other?.id)

		expect(input).toHaveAccessibleDescription(
			expect.stringContaining('Enter a valid expiration date (MM/YY)'),
		)

		expect(input).toHaveAccessibleDescription(expect.stringContaining('Card declined'))
	})

	it('uses a custom invalid message and clears it once valid', async () => {
		const { container } = renderUI(<CreditCardInputExpiry invalidMessage="Bad expiry" />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

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

		const user = setupUser()

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

	it('reports the verdict of the masked entry for Arabic-Indic digits', async () => {
		const verdicts: boolean[] = []

		const { container } = renderUI(
			<CreditCardInputCvv brand="visa" onValidityChange={(v) => verdicts.push(v.isValid)} />,
		)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-cvv')

		await setupUser().type(input, '١٢٣')

		// The field shows "123", so the verdict is the verdict of "123".
		expect(input.value).toBe('123')

		expect(verdicts).toEqual([false, false, true])
	})

	it('reports the verdict of the masked entry when a caller maxLength lets in a long entry', () => {
		const onValidityChange = vi.fn()

		const { container } = renderUI(
			<CreditCardInputCvv brand="visa" maxLength={4} onValidityChange={onValidityChange} />,
		)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-cvv')

		// The maxLength of the caller replaces the cap of the brand, so the field
		// takes four digits.
		fireEvent.change(input, { target: { value: '1234' } })

		// The mask keeps "123", so the verdict is the verdict of "123".
		expect(input).toHaveValue('123')

		expect(onValidityChange).toHaveBeenLastCalledWith({ isValid: true, isPotentiallyValid: true })
	})

	it('re-measures the entry when a brand change shrinks the length', async () => {
		const { container, rerender } = renderUI(<CreditCardInputCvv brand="amex" />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-cvv')

		await setupUser().type(input, '1234')

		rerender(<CreditCardInputCvv brand="visa" />)

		// Visa caps at three, so the stored value truncates and stays complete.
		expect(input).toHaveValue('123')

		expect(bySlot(container, 'message')).not.toBeInTheDocument()
	})

	it('reports the truncation to a controlled parent when a brand change shrinks the length', () => {
		const onValueChange = vi.fn()

		const onValidityChange = vi.fn()

		const { container, rerender } = renderUI(
			<CreditCardInputCvv
				brand="amex"
				value="1234"
				onValueChange={onValueChange}
				onValidityChange={onValidityChange}
			/>,
		)

		rerender(
			<CreditCardInputCvv
				brand="visa"
				value="1234"
				onValueChange={onValueChange}
				onValidityChange={onValidityChange}
			/>,
		)

		// The parent holds "1234" and Visa caps at three. The field shows "123",
		// so the parent gets "123" and the verdict is the verdict of "123".
		expect(getSlot(container, 'credit-card-input-cvv')).toHaveValue('123')

		expect(onValueChange).toHaveBeenCalledExactlyOnceWith('123')

		expect(onValidityChange).toHaveBeenLastCalledWith({ isValid: true, isPotentiallyValid: true })
	})

	it.each<[string, 'visa' | 'amex', string, string]>([
		['caps input at 3 digits for non-Amex brands', 'visa', '12345', '123'],
		['allows 4 digits for Amex', 'amex', '12345', '1234'],
		['strips non-digit characters', 'visa', 'ab12c', '12'],
	])('%s', async (_name, brand, typed, expected) => {
		const { container } = renderUI(<CreditCardInputCvv brand={brand} />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-cvv')

		const user = setupUser()

		await user.type(input, typed)

		expect(input.value).toBe(expected)
	})
})

/** The props that a default-name case gives a card field. */
type NameProps = { id?: string; 'aria-label'?: string }

/** The three card fields, each with its default name. */
const cardFields: [string, (props: NameProps) => ReactElement, string][] = [
	['CreditCardInput', (props) => <CreditCardInput {...props} />, 'Card number'],
	['CreditCardInputExpiry', (props) => <CreditCardInputExpiry {...props} />, 'Expiration date'],
	['CreditCardInputCvv', (props) => <CreditCardInputCvv {...props} />, 'Security code'],
]

/** The id that a native label outside a Field points at. */
const FIELD_ID = 'card-field'

// The three fields share one policy: the default name fills a missing name,
// and a Field Label, a native label, or an explicit aria-label replaces it.
describe.each(cardFields)('%s default name', (_name, field, fallback) => {
	it('has the default name when nothing labels it', () => {
		renderUI(field({}))

		expect(screen.getByRole('textbox', { name: fallback })).toHaveAttribute('aria-label', fallback)
	})

	it('takes its name from a Field Label, with no default name', () => {
		renderUI(
			<Field>
				<Label>Payment</Label>
				{field({})}
			</Field>,
		)

		expect(screen.getByRole('textbox', { name: 'Payment' })).not.toHaveAttribute('aria-label')
	})

	it('takes its name from a native label outside a Field after mount', () => {
		renderUI(
			<>
				<label htmlFor={FIELD_ID}>Payment</label>
				{field({ id: FIELD_ID })}
			</>,
		)

		expect(screen.getByRole('textbox', { name: 'Payment' })).not.toHaveAttribute('aria-label')
	})

	it('hydrates next to a native label with no mismatch, then drops the default name', () => {
		const element = (
			<div>
				<label htmlFor={FIELD_ID}>Payment</label>
				{field({ id: FIELD_ID })}
			</div>
		)

		const container = attach(document.createElement('div'))

		container.innerHTML = renderToString(element)

		// The server render cannot read the label, so its markup has the default name.
		expect(container.querySelector('input')).toHaveAttribute('aria-label', fallback)

		// A text or a node mismatch reaches `onRecoverableError`, and React logs
		// an attribute mismatch to the console.
		const onRecoverableError = vi.fn()

		const consoleError = vi.spyOn(console, 'error')

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, element, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(screen.getByRole('textbox', { name: 'Payment' })).not.toHaveAttribute('aria-label')
	})

	it.each<[string, (input: ReactElement) => ReactElement]>([
		['with no label', (input) => input],
		[
			'in a Field with a Label',
			(input) => (
				<Field>
					<Label>Payment</Label>
					{input}
				</Field>
			),
		],
		[
			'next to a native label',
			(input) => (
				<>
					<label htmlFor={FIELD_ID}>Payment</label>
					{input}
				</>
			),
		],
	])('lets an explicit aria-label win %s', (_context, wrap) => {
		renderUI(wrap(field({ id: FIELD_ID, 'aria-label': 'Card details' })))

		expect(screen.getByRole('textbox', { name: 'Card details' })).toHaveAttribute(
			'aria-label',
			'Card details',
		)
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

		await setupUser().type(input, typed)

		expect(input.value).toBe(expected)
	})

	// The masks keep only digits. A letter that the mask drops must not move the
	// caret, so the next digit goes where the letter went.
	it.each<[string, () => ReactElement, string, number, string]>([
		['credit-card-input', () => <CreditCardInput />, '42424242', 2, '4234 2424 2'],
		['credit-card-input-expiry', () => <CreditCardInputExpiry />, '122', 2, '12/32'],
		['credit-card-input-cvv', () => <CreditCardInputCvv />, '12', 1, '132'],
	])(
		'keeps the %s caret in place when the mask drops a letter',
		async (slot, render, typed, caret, expected) => {
			const { container } = renderUI(render())

			const input = getSlot<HTMLInputElement>(container, slot)

			const user = setupUser()

			await user.type(input, typed)

			input.setSelectionRange(caret, caret)

			await user.keyboard('x')

			expect(input.selectionStart).toBe(caret)

			await user.keyboard('3')

			expect(input.value).toBe(expected)
		},
	)

	// The masks change a digit of a different script to its ASCII digit. The
	// caret stays after each typed digit, so the digits keep the typed order.
	it.each<[string, () => ReactElement, string, string]>([
		['credit-card-input', () => <CreditCardInput />, '٤١٢٣', '4123'],
		['credit-card-input-cvv', () => <CreditCardInputCvv />, '١٢٣', '123'],
		['credit-card-input-expiry', () => <CreditCardInputExpiry />, '١٢٢٧', '12/27'],
	])(
		'keeps the typed order of Arabic-Indic digits in the %s',
		async (slot, render, typed, expected) => {
			const { container } = renderUI(render())

			const input = getSlot<HTMLInputElement>(container, slot)

			await setupUser().type(input, typed)

			expect(input.value).toBe(expected)
		},
	)

	// An expiry digit before the end goes through the mask, not the pad of a
	// one-digit month. The mask keeps the digit, and the caret stays after it.
	it('keeps an Arabic-Indic digit typed before the expiry year', async () => {
		const { container } = renderUI(<CreditCardInputExpiry />)

		const input = getSlot<HTMLInputElement>(container, 'credit-card-input-expiry')

		const user = setupUser()

		await user.type(input, '١٢٧')

		input.setSelectionRange(3, 3)

		await user.keyboard('٢')

		expect(input.value).toBe('12/27')

		expect(input.selectionStart).toBe(4)
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

		const user = setupUser()

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

		const user = setupUser()

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

describe('CreditCardInputExpiry form reset', () => {
	it('clears the typed invalid mark when the form resets', async () => {
		const user = setupUser()

		const onValidityChange = vi.fn()

		renderUI(
			<Form defaultValues={{ exp: '' }}>
				<CreditCardInputExpiry name="exp" onValidityChange={onValidityChange} />
				<Button type="reset">Reset</Button>
			</Form>,
		)

		const input = screen.getByLabelText('Expiration date')

		await user.type(input, '1399')

		await user.tab()

		expect(input).toHaveAttribute('aria-invalid', 'true')

		await user.click(screen.getByRole('button', { name: 'Reset' }))

		expect(input).toHaveValue('')

		expect(input).not.toHaveAttribute('aria-invalid')

		expect(screen.queryByText('Enter a valid expiration date (MM/YY)')).not.toBeInTheDocument()

		expect(onValidityChange).toHaveBeenLastCalledWith(validateCardExpiry(''))
	})
})
