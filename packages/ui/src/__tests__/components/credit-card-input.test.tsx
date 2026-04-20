import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	CreditCardCvvInput,
	CreditCardExpiryInput,
	CreditCardInput,
	detectCardBrand,
	formatCardNumber,
	formatExpiry,
} from '../../components/credit-card-input'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('CreditCardInput', () => {
	it('renders an input with type text and numeric inputMode', () => {
		const { container } = renderUI(<CreditCardInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('type', 'text')

		expect(input).toHaveAttribute('inputmode', 'numeric')
	})

	it('renders a credit card icon prefix by default', () => {
		const { container } = renderUI(<CreditCardInput />)

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<CreditCardInput className="custom" />)

		const input = bySlot(container, 'input')

		expect(input?.className).toContain('custom')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CreditCardInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<CreditCardInput placeholder="1234 1234 1234 1234" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', '1234 1234 1234 1234')
	})

	it('formats 16-digit card numbers in 4-4-4-4 groups', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '4242424242424242')

		expect(input.value).toBe('4242 4242 4242 4242')

		expect(onChange).toHaveBeenLastCalledWith('4242 4242 4242 4242')
	})

	it('formats Amex numbers in 4-6-5 groups', async () => {
		const { container } = renderUI(<CreditCardInput />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '378282246310005')

		expect(input.value).toBe('3782 822463 10005')
	})

	it('strips non-digit characters', async () => {
		const { container } = renderUI(<CreditCardInput />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'abc4242')

		expect(input.value).toBe('4242')
	})

	it('caps length at the max for the detected brand', async () => {
		const { container } = renderUI(<CreditCardInput />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '37828224631000599')

		expect(input.value).toBe('3782 822463 10005')
	})

	it('surfaces the detected brand via onBrandChange', async () => {
		const onBrandChange = vi.fn()

		const { container } = renderUI(<CreditCardInput onBrandChange={onBrandChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '4')

		expect(onBrandChange).toHaveBeenLastCalledWith('visa')
	})

	it('formats defaultValue on initial render', () => {
		const { container } = renderUI(<CreditCardInput defaultValue="4242424242424242" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		expect(input.value).toBe('4242 4242 4242 4242')
	})

	it('disables the input when disabled', () => {
		const { container } = renderUI(<CreditCardInput disabled />)

		const input = bySlot(container, 'input')

		expect(input).toBeDisabled()
	})
})

describe('CreditCardExpiryInput', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<CreditCardExpiryInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CreditCardExpiryInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('uses MM/YY as the default placeholder', () => {
		const { container } = renderUI(<CreditCardExpiryInput />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', 'MM/YY')
	})

	it('inserts a slash after the month digits', async () => {
		const { container } = renderUI(<CreditCardExpiryInput />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '1228')

		expect(input.value).toBe('12/28')
	})

	it('pads single-digit months greater than 1 with a leading zero', async () => {
		const { container } = renderUI(<CreditCardExpiryInput />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '5')

		expect(input.value).toBe('05/')
	})

	it('strips non-digit characters', async () => {
		const { container } = renderUI(<CreditCardExpiryInput />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'ab12cd25')

		expect(input.value).toBe('12/25')
	})
})

describe('CreditCardCvvInput', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<CreditCardCvvInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(<CreditCardCvvInput ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)
	})

	it('caps input at 3 digits for non-Amex brands', async () => {
		const { container } = renderUI(<CreditCardCvvInput brand="visa" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12345')

		expect(input.value).toBe('123')
	})

	it('allows 4 digits for Amex', async () => {
		const { container } = renderUI(<CreditCardCvvInput brand="amex" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '12345')

		expect(input.value).toBe('1234')
	})

	it('strips non-digit characters', async () => {
		const { container } = renderUI(<CreditCardCvvInput brand="visa" />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'ab12c')

		expect(input.value).toBe('12')
	})
})

describe('detectCardBrand', () => {
	it('identifies Visa numbers', () => {
		expect(detectCardBrand('4242424242424242')?.brand).toBe('visa')
	})

	it('identifies Amex numbers', () => {
		expect(detectCardBrand('378282246310005')?.brand).toBe('amex')
	})

	it('identifies Mastercard numbers', () => {
		expect(detectCardBrand('5555555555554444')?.brand).toBe('mastercard')
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

	it('keeps a leading 0 or 1 un-padded', () => {
		expect(formatExpiry('0')).toBe('0')
		expect(formatExpiry('1')).toBe('1')
	})

	it('pads single-digit months greater than 1', () => {
		expect(formatExpiry('5')).toBe('05/')
	})

	it('formats four digits as MM/YY', () => {
		expect(formatExpiry('1228')).toBe('12/28')
	})
})
