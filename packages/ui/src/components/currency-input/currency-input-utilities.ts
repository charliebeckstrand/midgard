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

export function isMeaningful(c: string, decimal: string) {
	return (c >= '0' && c <= '9') || c === '-' || c === MINUS_SIGN || c === decimal
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

export function formatEditing(
	raw: string,
	locale: string | undefined,
	decimal: string,
	maxFractionDigits: number,
) {
	// The display can hold the locale minus sign U+2212. It becomes "-" before
	// the filter, which keeps only the ASCII sign.
	const withoutDisallowed = raw.replace(minusSignRe, '-').replace(disallowedRe(decimal), '')

	const negative = withoutDisallowed.startsWith('-')

	const cleaned = collapseExtraDecimals(withoutDisallowed.replace(/-/g, ''), decimal)

	const [intPart = '', fracPart] = cleaned.split(decimal)

	let result = (negative ? '-' : '') + groupIntegerPart(intPart, fracPart !== undefined, locale)

	if (fracPart !== undefined && maxFractionDigits > 0) {
		result += decimal + fracPart.slice(0, maxFractionDigits)
	}

	return result
}

export function parseEditing(text: string, group: string, decimal: string) {
	const groupRe = separatorRe(group)

	const normalized = text.replace(groupRe, '').replace(decimal, '.')

	if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
		return undefined
	}

	const n = Number(normalized)

	if (Number.isNaN(n)) return undefined

	// "-0" gives -0, and Intl writes its sign ("-0.00"). Zero has no sign, so
	// the value is 0.
	return n === 0 ? 0 : n
}
