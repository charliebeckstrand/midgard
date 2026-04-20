export type CreditCardBrand =
	| 'visa'
	| 'mastercard'
	| 'amex'
	| 'discover'
	| 'diners'
	| 'jcb'
	| 'unionpay'

export type CreditCardBrandInfo = {
	brand: CreditCardBrand
	label: string
	lengths: number[]
	gaps: number[]
	cvvLength: number
}

const BRANDS: Array<CreditCardBrandInfo & { pattern: RegExp }> = [
	{
		brand: 'amex',
		label: 'Amex',
		pattern: /^3[47]/,
		lengths: [15],
		gaps: [4, 10],
		cvvLength: 4,
	},
	{
		brand: 'visa',
		label: 'Visa',
		pattern: /^4/,
		lengths: [13, 16, 19],
		gaps: [4, 8, 12],
		cvvLength: 3,
	},
	{
		brand: 'mastercard',
		label: 'Mastercard',
		pattern: /^(5[1-5]|2(2(2[1-9]|[3-9]\d)|[3-6]\d\d|7([01]\d|20)))/,
		lengths: [16],
		gaps: [4, 8, 12],
		cvvLength: 3,
	},
	{
		brand: 'discover',
		label: 'Discover',
		pattern: /^(6011|65|64[4-9])/,
		lengths: [16, 19],
		gaps: [4, 8, 12],
		cvvLength: 3,
	},
	{
		brand: 'diners',
		label: 'Diners Club',
		pattern: /^(3(0[0-5]|095|[689]))/,
		lengths: [14, 16, 19],
		gaps: [4, 10],
		cvvLength: 3,
	},
	{
		brand: 'jcb',
		label: 'JCB',
		pattern: /^35(2[89]|[3-8])/,
		lengths: [16, 17, 18, 19],
		gaps: [4, 8, 12],
		cvvLength: 3,
	},
	{
		brand: 'unionpay',
		label: 'UnionPay',
		pattern: /^62/,
		lengths: [16, 17, 18, 19],
		gaps: [4, 8, 12],
		cvvLength: 3,
	},
]

export function detectCardBrand(digits: string): CreditCardBrandInfo | undefined {
	for (const entry of BRANDS) {
		if (entry.pattern.test(digits)) {
			const { pattern: _pattern, ...info } = entry

			return info
		}
	}

	return undefined
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
