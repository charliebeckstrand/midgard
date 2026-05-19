import cardValidator from 'card-validator'
import type { CreditCardBrand, CreditCardBrandInfo } from './types'

const { number, cvv } = cardValidator

// Allowlist mapping card-validator's `type` strings to the package's public
// brand names + labels. Brands outside this list (maestro, elo, mir, hiper,
// hipercard) resolve to undefined.
const BRANDS: ReadonlyArray<{
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

export function detectCardBrand(digits: string): CreditCardBrandInfo | undefined {
	const { card } = number(digits)

	if (!card) return undefined

	const entry = BRANDS.find((b) => b.type === card.type)

	if (!entry) return undefined

	return {
		brand: entry.brand,
		label: entry.label,
		lengths: card.lengths,
		gaps: card.gaps,
		cvvLength: card.code.size,
	}
}

export function formatCardNumber(raw: string): {
	formatted: string
	digits: string
	brand: CreditCardBrandInfo | undefined
} {
	const allDigits = raw.replace(/\D/g, '')

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

export function formatExpiry(raw: string): string {
	const d = raw.replace(/\D/g, '').slice(0, 4)

	if (d.length === 0) return ''

	// Auto-prefix single digit months > 1 (e.g. "4" → "04/").
	if (d.length === 1) {
		if (d[0] === '0' || d[0] === '1') return d

		return `0${d[0]}/`
	}

	const month = d.slice(0, 2)

	if (d.length === 2) return `${month}/`

	return `${month}/${d.slice(2)}`
}

export function formatCvv(raw: string, maxLength: number): string {
	return raw.replace(/\D/g, '').slice(0, maxLength)
}

export type CardValidity = {
	isValid: boolean
	isPotentiallyValid: boolean
}

export function validateCardNumber(value: string): CardValidity {
	const { isValid, isPotentiallyValid } = number(value.replace(/\D/g, ''))

	return { isValid, isPotentiallyValid }
}

export function validateCardCvv(value: string, brand?: CreditCardBrand): CardValidity {
	const maxLength = brand === 'amex' ? 4 : 3

	const { isValid, isPotentiallyValid } = cvv(value.replace(/\D/g, ''), maxLength)

	return { isValid, isPotentiallyValid }
}
