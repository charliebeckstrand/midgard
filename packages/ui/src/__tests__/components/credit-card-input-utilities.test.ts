// @vitest-environment node
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	detectCardBrand,
	formatCardNumber,
	formatCvv,
	formatExpiry,
	validateCardCvv,
	validateCardExpiry,
	validateCardNumber,
} from '../../components/credit-card-input/credit-card-input-utilities'

// The decimal digits of other scripts, each by the code point of its zero.
const scripts: [string, number][] = [
	['Arabic-Indic', 0x0660],
	['Devanagari', 0x0966],
	['Bengali', 0x09e6],
	['fullwidth', 0xff10],
]

/** The mathematical monospace digit one, a digit outside the Basic Multilingual Plane. */
const ASTRAL_ONE = '\u{1d7f7}'

/** Writes the ASCII digits of `text` in the script whose zero is `zero`. */
const inScript = (text: string, zero: number) =>
	text.replace(/[0-9]/g, (digit) => String.fromCodePoint(zero + Number(digit)))

describe('detectCardBrand', () => {
	it.each([
		['Amex from a 37 prefix', '378282246310005', 'amex'],
		['Amex from a 34 prefix', '342824631000510', 'amex'],
		['Visa from a 4 prefix', '4111111111111111', 'visa'],
		['Mastercard from the 51-55 range', '5555555555554444', 'mastercard'],
		['Mastercard from the 2221-2720 range', '2221000000000009', 'mastercard'],
		['Discover', '6011111111111117', 'discover'],
		['Diners Club', '30569309025904', 'diners'],
		['JCB', '3530111333300000', 'jcb'],
		['UnionPay', '6200000000000005', 'unionpay'],
	])('detects %s', (_name, number, brand) => {
		expect(detectCardBrand(number)?.brand).toBe(brand)
	})

	it.each([
		['an unrecognized prefix', '9999999999999999'],
		['an empty string', ''],
	])('returns undefined for %s', (_name, number) => {
		expect(detectCardBrand(number)).toBeUndefined()
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

	it.each(scripts)('changes %s digits to ASCII digits', (_name, zero) => {
		const { formatted, digits, brand } = formatCardNumber(inScript('4111 1111 1111 1111', zero))

		expect(formatted).toBe('4111 1111 1111 1111')

		expect(digits).toBe('4111111111111111')

		expect(brand?.brand).toBe('visa')
	})
})

describe('formatExpiry', () => {
	it('returns an empty string when no digits are present', () => {
		expect(formatExpiry('')).toBe('')

		expect(formatExpiry('--')).toBe('')
	})

	it('passes a single digit through unchanged', () => {
		expect(formatExpiry('0')).toBe('0')

		expect(formatExpiry('1')).toBe('1')

		expect(formatExpiry('4')).toBe('4')
	})

	it('appends a slash after two digits, even when the month is invalid', () => {
		expect(formatExpiry('12')).toBe('12/')

		expect(formatExpiry('45')).toBe('45/')
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

	it('pads a one-digit month that a typed separator follows', () => {
		expect(formatExpiry('4/')).toBe('04/')

		expect(formatExpiry('4/2')).toBe('04/2')

		expect(formatExpiry('4/27')).toBe('04/27')

		expect(formatExpiry('1 26')).toBe('01/26')
	})

	it('does not pad a zero month or a two-digit month', () => {
		expect(formatExpiry('0/')).toBe('0')

		expect(formatExpiry('04/')).toBe('04/')

		expect(formatExpiry('12/')).toBe('12/')
	})

	it('keeps the last two digits of a four-digit year that a separator follows', () => {
		expect(formatExpiry('12/2027')).toBe('12/27')

		expect(formatExpiry('12 - 2027')).toBe('12/27')

		expect(formatExpiry('4/2027')).toBe('04/27')
	})

	it('does not cut a four-digit year with no separator before it', () => {
		expect(formatExpiry('122027')).toBe('12/20')
	})

	it.each(scripts)(
		'changes %s digits to ASCII digits before the pad and the cut',
		(_name, zero) => {
			expect(formatExpiry(inScript('1227', zero))).toBe('12/27')

			expect(formatExpiry(inScript('4/27', zero))).toBe('04/27')

			expect(formatExpiry(inScript('12/2027', zero))).toBe('12/27')
		},
	)
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

	it.each(scripts)('changes %s digits to ASCII digits', (_name, zero) => {
		expect(formatCvv(inScript('1234', zero), 3)).toBe('123')
	})
})

describe('a digit outside the Basic Multilingual Plane', () => {
	// The caret of a card mask cannot count such a digit. When a formatter
	// keeps one, the next typed digit goes in front of it.
	it('is removed by each card formatter', () => {
		expect(formatCardNumber(`41${ASTRAL_ONE}`).formatted).toBe('41')

		expect(formatCvv(`12${ASTRAL_ONE}`, 3)).toBe('12')

		expect(formatExpiry(`12${ASTRAL_ONE}`)).toBe('12/')
	})
})

describe('validateCardNumber', () => {
	it('accepts a Luhn-valid Visa test card', () => {
		expect(validateCardNumber('4111111111111111')).toEqual({
			isValid: true,
			isPotentiallyValid: true,
		})
	})

	it('rejects a Luhn-invalid sixteen-digit number that matches a Visa prefix', () => {
		// Same length and prefix as the test card above, but the trailing digit
		// breaks the Luhn checksum.
		expect(validateCardNumber('4111111111111112').isValid).toBe(false)
	})

	it('treats a partial prefix as potentially valid', () => {
		expect(validateCardNumber('4111')).toEqual({
			isValid: false,
			isPotentiallyValid: true,
		})
	})

	it('strips formatting characters before validating', () => {
		expect(validateCardNumber('4111-1111-1111-1111')).toEqual({
			isValid: true,
			isPotentiallyValid: true,
		})
	})

	it('accepts a Luhn-valid Amex test card', () => {
		expect(validateCardNumber('378282246310005')).toEqual({
			isValid: true,
			isPotentiallyValid: true,
		})
	})
})

describe('validateCardCvv', () => {
	it('accepts a 3-digit CVV for non-Amex brands', () => {
		expect(validateCardCvv('123', 'visa')).toEqual({
			isValid: true,
			isPotentiallyValid: true,
		})
	})

	it('rejects a 4-digit CVV for non-Amex brands', () => {
		expect(validateCardCvv('1234', 'visa').isValid).toBe(false)
	})

	it('accepts a 4-digit CVV for Amex', () => {
		expect(validateCardCvv('1234', 'amex')).toEqual({
			isValid: true,
			isPotentiallyValid: true,
		})
	})

	it('accepts both 3- and 4-digit CVVs when the brand is unknown', () => {
		// The input permits up to 4 digits before a brand is detected; neither
		// length hard-fails as invalid.
		expect(validateCardCvv('123', undefined).isValid).toBe(true)

		expect(validateCardCvv('1234', undefined).isValid).toBe(true)
	})

	it('treats a 2-digit input as potentially valid', () => {
		expect(validateCardCvv('12', 'visa')).toEqual({
			isValid: false,
			isPotentiallyValid: true,
		})
	})

	it('strips non-digit characters before validating', () => {
		expect(validateCardCvv('1-2-3', 'visa').isValid).toBe(true)
	})
})

describe('validateCardExpiry', () => {
	it('accepts a near-future month/year', () => {
		const yy = String((new Date().getFullYear() + 2) % 100).padStart(2, '0')

		expect(validateCardExpiry(`12/${yy}`)).toEqual({
			isValid: true,
			isPotentiallyValid: true,
		})
	})

	it('rejects a month outside 01–12', () => {
		expect(validateCardExpiry('13/2030').isValid).toBe(false)
	})

	it('rejects a date in the past', () => {
		expect(validateCardExpiry('01/2000')).toEqual({
			isValid: false,
			isPotentiallyValid: false,
		})
	})

	it('treats a partial expiry as potentially valid', () => {
		expect(validateCardExpiry('12/')).toEqual({
			isValid: false,
			isPotentiallyValid: true,
		})
	})

	it('gives a final verdict for a full-length entry with the year 20', () => {
		// In the years 2000 to 2099, card-validator reads the year "20" as the
		// start of a four-digit year. A full "MM/YY" entry cannot grow, so it
		// cannot become valid.
		vi.useFakeTimers({ now: new Date(2026, 9, 5) })

		onTestFinished(() => {
			vi.useRealTimers()
		})

		expect(validateCardExpiry('12/20')).toEqual({
			isValid: false,
			isPotentiallyValid: false,
		})
	})
})
