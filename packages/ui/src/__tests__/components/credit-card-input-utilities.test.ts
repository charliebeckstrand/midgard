import { describe, expect, it } from 'vitest'
import {
	detectCardBrand,
	formatCardNumber,
	formatCvv,
	formatExpiry,
} from '../../components/credit-card-input/credit-card-input-utilities'

describe('detectCardBrand', () => {
	it('detects Amex from a 34/37 prefix', () => {
		expect(detectCardBrand('378282246310005')?.brand).toBe('amex')

		expect(detectCardBrand('342824631000510')?.brand).toBe('amex')
	})

	it('detects Visa from a 4 prefix', () => {
		expect(detectCardBrand('4111111111111111')?.brand).toBe('visa')
	})

	it('detects Mastercard from the 51-55 range', () => {
		expect(detectCardBrand('5555555555554444')?.brand).toBe('mastercard')
	})

	it('detects Mastercard from the 2221-2720 range', () => {
		expect(detectCardBrand('2221000000000009')?.brand).toBe('mastercard')
	})

	it('detects Discover', () => {
		expect(detectCardBrand('6011111111111117')?.brand).toBe('discover')
	})

	it('detects Diners Club', () => {
		expect(detectCardBrand('30569309025904')?.brand).toBe('diners')
	})

	it('detects JCB', () => {
		expect(detectCardBrand('3530111333300000')?.brand).toBe('jcb')
	})

	it('detects UnionPay', () => {
		expect(detectCardBrand('6200000000000005')?.brand).toBe('unionpay')
	})

	it('returns undefined for an unrecognized prefix', () => {
		expect(detectCardBrand('9999999999999999')).toBeUndefined()
	})

	it('returns undefined for an empty string', () => {
		expect(detectCardBrand('')).toBeUndefined()
	})

	it('strips the internal regex pattern from the returned info', () => {
		const info = detectCardBrand('4111111111111111')

		expect(info && 'pattern' in info).toBe(false)
	})
})

describe('formatCardNumber', () => {
	it('strips non-digits and groups a Visa with single-space gaps', () => {
		expect(formatCardNumber('4111-1111-1111-1111').formatted).toBe('4111 1111 1111 1111')
	})

	it('uses the Amex 4-6-5 grouping pattern', () => {
		expect(formatCardNumber('378282246310005').formatted).toBe('3782 822463 10005')
	})

	it('returns the raw digits stripped of separators', () => {
		expect(formatCardNumber('4111-1111-1111-1111').digits).toBe('4111111111111111')
	})

	it('returns the detected brand alongside the formatted value', () => {
		expect(formatCardNumber('4111111111111111').brand?.brand).toBe('visa')
	})

	it('truncates the input to the brand’s maximum length', () => {
		// Amex caps at 15 digits.
		expect(formatCardNumber('37828224631000599999').digits).toBe('378282246310005')
	})

	it('falls back to the default 19-digit cap when no brand matches', () => {
		expect(formatCardNumber('99999999999999999999999').digits).toHaveLength(19)
	})

	it('returns an empty formatted string for empty input', () => {
		expect(formatCardNumber('')).toEqual({ formatted: '', digits: '', brand: undefined })
	})
})

describe('formatExpiry', () => {
	it('returns an empty string when no digits are present', () => {
		expect(formatExpiry('')).toBe('')

		expect(formatExpiry('--')).toBe('')
	})

	it('keeps a single digit "0" or "1" without auto-prefixing', () => {
		expect(formatExpiry('0')).toBe('0')

		expect(formatExpiry('1')).toBe('1')
	})

	it('auto-prefixes a single digit greater than 1 with a leading zero', () => {
		expect(formatExpiry('4')).toBe('04/')
	})

	it('appends a slash after a two-digit month', () => {
		expect(formatExpiry('12')).toBe('12/')
	})

	it('appends year digits after the slash', () => {
		expect(formatExpiry('1226')).toBe('12/26')
	})

	it('truncates beyond MM/YY', () => {
		expect(formatExpiry('1226999')).toBe('12/26')
	})

	it('strips non-digit characters', () => {
		expect(formatExpiry('12/26')).toBe('12/26')
	})
})

describe('formatCvv', () => {
	it('strips non-digits', () => {
		expect(formatCvv('1a2b3', 3)).toBe('123')
	})

	it('caps the result at maxLength', () => {
		expect(formatCvv('12345', 3)).toBe('123')
	})

	it('returns an empty string when no digits are present', () => {
		expect(formatCvv('abc', 3)).toBe('')
	})
})
