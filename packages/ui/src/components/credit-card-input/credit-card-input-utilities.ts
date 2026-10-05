import cardValidator from 'card-validator'
import { digitsOnly } from '../../utilities'
import type { CreditCardBrand, CreditCardBrandInfo } from './types'

const { cvv, expirationDate } = cardValidator

type NumberVerification = ReturnType<typeof cardValidator.number>

let lastDigits: string | undefined

let lastVerification: NumberVerification | undefined

/**
 * Runs card-validator's `number` check, with a cache of one entry.
 *
 * One keystroke formats the number, detects the brand, and validates the
 * number. All three read the same digits, so the check runs one time.
 */
function number(digits: string): NumberVerification {
	if (digits !== lastDigits || lastVerification === undefined) {
		lastVerification = cardValidator.number(digits)

		lastDigits = digits
	}

	return lastVerification
}

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

/** A decimal digit of any script. */
const DECIMAL_DIGIT = /\p{Nd}/u

/** The last code point of the Basic Multilingual Plane. */
const BMP_END = 0xffff

/**
 * Changes each decimal digit in the Basic Multilingual Plane, such as an
 * Arabic-Indic or a fullwidth digit, to its ASCII digit. Thus `digitsOnly`
 * keeps the digit.
 *
 * A digit outside the plane, such as a mathematical or an Adlam digit, stays
 * as it is, and `digitsOnly` removes it. The caret of a card mask reads one
 * UTF-16 code unit and cannot count such a digit. When the mask keeps one, the
 * next typed digit goes in front of it.
 *
 * Unicode puts the digits 0 to 9 of each set in ten consecutive code points.
 * Thus the value of a digit is its distance from the start of its run of
 * digits. The modulo 10 covers a run that holds more than one set.
 */
function toAsciiDigits(text: string): string {
	return text.replace(/\p{Nd}/gu, (digit) => {
		const code = digit.codePointAt(0) ?? 0

		if (code > BMP_END) return digit

		let start = code

		while (start > 0 && DECIMAL_DIGIT.test(String.fromCodePoint(start - 1))) start--

		return String((code - start) % 10)
	})
}

/** Resolves a digit string to its {@link CreditCardBrandInfo}, or `undefined` when no supported brand matches. */
export function detectCardBrand(digits: string): CreditCardBrandInfo | undefined {
	const { card } = number(digits)

	if (!card) return undefined

	const entry = brands.find((b) => b.type === card.type)

	if (!entry) return undefined

	return {
		brand: entry.brand,
		label: entry.label,
		// Copies, because the cached check shares one `card` between calls.
		lengths: [...card.lengths],
		gaps: [...card.gaps],
		cvvLength: card.code.size,
	}
}

/**
 * Strips a raw string to digits, truncates to the brand's max length, and
 * spaces it into brand-aware groups. Returns the formatted text, digits, and
 * detected brand. A decimal digit in the Basic Multilingual Plane, such as
 * `٤`, becomes its ASCII digit. A digit outside that plane is removed.
 */
export function formatCardNumber(raw: string): {
	formatted: string
	digits: string
	brand: CreditCardBrandInfo | undefined
} {
	const allDigits = digitsOnly(toAsciiDigits(raw))

	const brand = detectCardBrand(allDigits)

	const maxLength = brand ? Math.max(...brand.lengths) : 19

	const digits = allDigits.slice(0, maxLength)

	const gaps = brand?.gaps ?? [4, 8, 12, 16]

	const formatted = Array.from(digits, (d, i) => (gaps.includes(i) ? ' ' : '') + d).join('')

	return { formatted, digits, brand }
}

/** A one-digit month, 1 to 9, at the start of an entry, when a separator follows it. */
const ONE_DIGIT_MONTH = /^\D*([1-9])(?=\D)/

/**
 * A two-digit month, a separator, and a four-digit year, as in "12/2027". The
 * groups hold the month with the separator, and the last two year digits.
 */
const FOUR_DIGIT_YEAR = /^(\D*\d{2}\D+)\d{2}(\d{2})\D*$/

/**
 * Strips a raw string to at most four digits and masks them into "MM/YY",
 * inserting the slash after the month. A one-digit month that a typed
 * separator follows gets a leading zero, so `4/27` masks to `04/27`. A
 * four-digit year that a separator follows keeps its last two digits, so
 * `12/2027` masks to `12/27`. A decimal digit in the Basic Multilingual Plane
 * becomes its ASCII digit first, so `٤/٢٧` masks to `04/27`. A digit outside
 * that plane is removed.
 */
export function formatExpiry(raw: string): string {
	const text = toAsciiDigits(raw).replace(ONE_DIGIT_MONTH, '0$1').replace(FOUR_DIGIT_YEAR, '$1$2')

	const d = digitsOnly(text).slice(0, 4)

	if (d.length < 2) return d

	const month = d.slice(0, 2)

	if (d.length === 2) return `${month}/`

	return `${month}/${d.slice(2)}`
}

/**
 * Strips a raw string to digits and truncates to `maxLength`. A decimal digit
 * in the Basic Multilingual Plane, such as `٤`, becomes its ASCII digit. A
 * digit outside that plane is removed.
 */
export function formatCvv(raw: string, maxLength: number): string {
	return digitsOnly(toAsciiDigits(raw)).slice(0, maxLength)
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

/** The length of a full "MM/YY" expiry entry. */
const EXPIRY_LENGTH = 'MM/YY'.length

/**
 * Validates an "MM/YY" expiry via card-validator's `expirationDate`,
 * enforcing the month range and rejecting past dates. A full-length entry
 * cannot grow, so its verdict is final: `isPotentiallyValid` equals `isValid`.
 */
export function validateCardExpiry(value: string): CardValidity {
	const { isValid, isPotentiallyValid } = expirationDate(value)

	// card-validator reads a two-digit year that is the same as the first two
	// digits of the current year, such as "20", as the start of a four-digit
	// year. The mask keeps only two year digits, so the entry cannot grow.
	if (value.length === EXPIRY_LENGTH) return { isValid, isPotentiallyValid: isValid }

	return { isValid, isPotentiallyValid }
}
