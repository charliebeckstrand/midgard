export function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Editing regexes cache by separator (separators vary by locale).
// String.replace resets lastIndex after each call; shared global regexes stay safe.
function memoRe(source: (key: string) => string): (key: string) => RegExp {
	const cache = new Map<string, RegExp>()

	return (key) => {
		let re = cache.get(key)

		if (re === undefined) {
			re = new RegExp(source(key), 'g')

			cache.set(key, re)
		}

		return re
	}
}

const separatorRe = memoRe(escapeRegExp)

const disallowedRe = memoRe((decimal) => `[^\\d\\-${escapeRegExp(decimal)}]`)

// The currency style writes the minus sign U+2212 in some locales (sv-SE,
// fi-FI, nb-NO). `formatEditing` reads it as "-", so the caret counts it too.
const MINUS_SIGN = '\u2212'

const minusSignRe = /\u2212/g

// A decimal keypad follows the region of the device, not the locale of the
// field. Thus it can offer only the other mark: "," in an en-US field, or "."
// in a de-DE field.
function otherMarkOf(decimal: string) {
	if (decimal === '.') return ','

	if (decimal === ',') return '.'

	return undefined
}

// The format writes the last group mark of each locale before three digits,
// and a digit typed at the end then gives four. When the other mark is also
// the locale group, three digits or more after it can come from the format.
// Thus that mark is a group mark before three digits or more, at any
// `maxFractionDigits`.
const GROUP_FRACTION_LIMIT = 2

// Gives the index of the other mark that the text keeps as its decimal, else
// -1. The other mark is the decimal only when the text holds no locale
// decimal, it is the last mark, and 1 to `maxFractionDigits` digits follow it.
// Else it is a group mark. With no digit after it, the text keeps the mark, so
// a later digit can decide it. The value is then the same as for a group mark.
function otherDecimalIndex(
	text: string,
	group: string | undefined,
	decimal: string,
	maxFractionDigits: number,
) {
	const other = otherMarkOf(decimal)

	if (other === undefined || maxFractionDigits === 0 || text.includes(decimal)) return -1

	const index = text.lastIndexOf(other)

	if (index < 0) return -1

	const tail = text.slice(index + other.length)

	if (group !== undefined && group !== other && tail.includes(group)) return -1

	const limit =
		group === other ? Math.min(maxFractionDigits, GROUP_FRACTION_LIMIT) : maxFractionDigits

	return tail.replace(/\D/g, '').length <= limit ? index : -1
}

// Puts the locale decimal in place of the other mark at `index`, so that the
// text splits at the locale decimal.
function withDecimalAt(text: string, index: number, decimal: string) {
	return index < 0 ? text : text.slice(0, index) + decimal + text.slice(index + 1)
}

// `formatEditing` keeps a sign only at the start, so the caret counts a sign
// only at index 0. It keeps the other mark only at the index that
// `otherDecimalIndex` gives, so the caret counts the other mark only there.
export function isMeaningful(
	c: string,
	index: number,
	text: string,
	group: string,
	decimal: string,
	maxFractionDigits: number,
) {
	if (c === '-' || c === MINUS_SIGN) return index === 0

	if ((c >= '0' && c <= '9') || c === decimal) return true

	return index === otherDecimalIndex(text, group, decimal, maxFractionDigits)
}

// Collapses every decimal separator after the first, keeping a single split
// point between the integer and fraction segments.
function collapseExtraDecimals(value: string, decimal: string) {
	const firstDecimal = value.indexOf(decimal)

	if (firstDecimal < 0) return value

	const split = firstDecimal + decimal.length

	return value.slice(0, split) + value.slice(split).replace(separatorRe(decimal), '')
}

const groupFormats = new Map<string | undefined, Intl.NumberFormat>()

// The editing text groups with the currency style, as the display and
// `parseEditing` do (de-AT "." in place of U+00A0). The code XXX means "no
// currency", so the format writes the currency separators of the locale.
// `numberingSystem: 'latn'` keeps grouped output in ASCII digits so the
// editing parser (which only recognizes 0-9) and the caret restore stay
// aligned in non-latn-default locales (ar-EG, fa-IR, ne-NP, bn-IN).
function groupFormat(locale: string | undefined) {
	let format = groupFormats.get(locale)

	if (format === undefined) {
		format = new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: 'XXX',
			numberingSystem: 'latn',
			useGrouping: true,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		})

		groupFormats.set(locale, format)
	}

	return format
}

// Strips redundant leading zeros and applies locale digit grouping. An empty
// integer part renders as '0' only when a fraction follows, else stays empty.
// `disallowedRe` leaves only ASCII digits here, so `BigInt` cannot throw. It
// groups every digit as typed: a `Number` loses digits past 2^53.
function groupIntegerPart(intPart: string, hasFraction: boolean, locale: string | undefined) {
	const trimmed = intPart.replace(/^0+(?=\d)/, '')

	if (trimmed === '') return hasFraction ? '0' : ''

	return groupFormat(locale)
		.formatToParts(BigInt(trimmed))
		.filter((part) => part.type === 'integer' || part.type === 'group')
		.map((part) => part.value)
		.join('')
}

// The group mark that `groupIntegerPart` writes for the locale.
function groupMarkOf(locale: string | undefined) {
	return groupFormat(locale)
		.formatToParts(1000n)
		.find((part) => part.type === 'group')?.value
}

export function formatEditing(
	raw: string,
	locale: string | undefined,
	decimal: string,
	maxFractionDigits: number,
) {
	// The display can hold the locale minus sign U+2212. It becomes "-" before
	// the filter, which keeps only the ASCII sign.
	const signed = raw.replace(minusSignRe, '-')

	const otherIndex = otherDecimalIndex(signed, groupMarkOf(locale), decimal, maxFractionDigits)

	// The text splits at the other mark when it is the decimal, and the result
	// keeps the typed mark. A later digit can then make it a group mark.
	const mark = otherIndex < 0 ? decimal : signed.charAt(otherIndex)

	const withoutDisallowed = withDecimalAt(signed, otherIndex, decimal).replace(
		disallowedRe(decimal),
		'',
	)

	const negative = withoutDisallowed.startsWith('-')

	const cleaned = collapseExtraDecimals(withoutDisallowed.replace(/-/g, ''), decimal)

	const [intPart = '', fracPart] = cleaned.split(decimal)

	let result = (negative ? '-' : '') + groupIntegerPart(intPart, fracPart !== undefined, locale)

	if (fracPart !== undefined && maxFractionDigits > 0) {
		result += mark + fracPart.slice(0, maxFractionDigits)
	}

	return result
}

export function parseEditing(
	text: string,
	group: string,
	decimal: string,
	maxFractionDigits: number,
) {
	const other = otherMarkOf(decimal)

	const marked = withDecimalAt(
		text,
		otherDecimalIndex(text, group, decimal, maxFractionDigits),
		decimal,
	)

	let withoutGroups = marked.replace(separatorRe(group), '')

	// Each other mark that is not the decimal is a group mark.
	if (other !== undefined) withoutGroups = withoutGroups.replace(separatorRe(other), '')

	const normalized = withoutGroups.replace(decimal, '.')

	if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
		return undefined
	}

	const n = Number(normalized)

	if (Number.isNaN(n)) return undefined

	// "-0" gives -0, and Intl writes its sign ("-0.00"). Zero has no sign, so
	// the value is 0.
	return n === 0 ? 0 : n
}
