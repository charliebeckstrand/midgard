import cardValidator from 'card-validator'
import { digitsOnly } from '../../utilities'
import type { CreditCardBrand, CreditCardBrandInfo } from './types'

const { number, cvv, expirationDate } = cardValidator

// Maps card-validator's `type` strings to public brand names and labels.
// Brands outside this list (maestro, elo, mir, hiper, hipercard) resolve to undefined.
const brands: ReadonlyArray<{
	type: string
	brand: CreditCardBrand
	label: string
}> = [
	{ type: 'visa', brand: 'visa', label: 'Visa' },
	{ type: 'mastercard', brand: 'mastercard', label: 'Mastercard' },
	{ type: 'american-express', brand: 'amex', label: 'Amex' },
	{ type: 'discover', brand: 'discover', label: 'Discover' },
	{ type: 'diners-club', brand: 'diners', label: 'Diners Club' },
	{ type: 'jcb', brand: 'jcb', label: 'JCB' },
	{ type: 'unionpay', brand: 'unionpay', label: 'UnionPay' },
]

/** Resolves a digit string to its {@link CreditCardBrandInfo}, or `undefined` when no supported brand matches. */
export function detectCardBrand(digits: string): CreditCardBrandInfo | undefined {
	const { card } = number(digits)

	if (!card) return undefined

	const entry = brands.find((b) => b.type === card.type)

	if (!entry) return undefined

	return {
		brand: entry.brand,
		label: entry.label,
		lengths: card.lengths,
		gaps: card.gaps,
		cvvLength: card.code.size,
	}
}

/** Strips a raw string to digits, truncates to the brand's max length, and spaces it into brand-aware groups; returns the formatted text, digits, and detected brand. */
export function formatCardNumber(raw: string): {
	formatted: string
	digits: string
	brand: CreditCardBrandInfo | undefined
} {
	const allDigits = digitsOnly(raw)

	const brand = detectCardBrand(allDigits)

	const maxLength = brand ? Math.max(...brand.lengths) : 19

	const digits = allDigits.slice(0, maxLength)

	const gaps = brand?.gaps ?? [4, 8, 12, 16]

	let formatted = ''

	for (let i = 0; i < digits.length; i++) {
		if (gaps.includes(i)) formatted += ' '

		formatted += digits[i]
	}

	return { formatted, digits, brand }
}

/** Strips a raw string to at most four digits and masks them into "MM/YY", inserting the slash after the month. */
export function formatExpiry(raw: string): string {
	const d = digitsOnly(raw).slice(0, 4)

	if (d.length < 2) return d

	const month = d.slice(0, 2)

	if (d.length === 2) return `${month}/`

	return `${month}/${d.slice(2)}`
}

/** Strips a raw string to digits and truncates to `maxLength`. */
export function formatCvv(raw: string, maxLength: number): string {
	return digitsOnly(raw).slice(0, maxLength)
}

/** Validity verdict for a card field: `isValid` is the final pass, `isPotentiallyValid` allows in-progress input. */
export type CardValidity = {
	isValid: boolean
	isPotentiallyValid: boolean
}

/** Validates a card number via card-validator (brand pattern, length, and Luhn checksum). */
export function validateCardNumber(value: string): CardValidity {
	const { isValid, isPotentiallyValid } = number(digitsOnly(value))

	return { isValid, isPotentiallyValid }
}

/** Validates a CVV against the brand-derived length (Amex 4, others 3; 3 or 4 when `brand` is omitted). */
export function validateCardCvv(value: string, brand?: CreditCardBrand): CardValidity {
	// Without a brand, both 3- and 4-digit CVVs pass (matching the 4-digit
	// max that resolveCvvLength allows before the brand is known).
	const maxLength = brand === 'amex' ? 4 : brand === undefined ? [3, 4] : 3

	const { isValid, isPotentiallyValid } = cvv(digitsOnly(value), maxLength)

	return { isValid, isPotentiallyValid }
}

/**
 * Validates an "MM/YY" expiry via card-validator's `expirationDate`,
 * enforcing the month range and rejecting past dates.
 */
export function validateCardExpiry(value: string): CardValidity {
	const { isValid, isPotentiallyValid } = expirationDate(value)

	return { isValid, isPotentiallyValid }
}
