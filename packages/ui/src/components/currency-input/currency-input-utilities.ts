export function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Editing regexes cache by separator (separators vary by locale).
// String.replace resets lastIndex after each call; shared global regexes stay safe.
const separatorReCache = new Map<string, RegExp>()

function separatorRe(separator: string) {
	let re = separatorReCache.get(separator)

	if (re === undefined) {
		re = new RegExp(escapeRegExp(separator), 'g')

		separatorReCache.set(separator, re)
	}

	return re
}

const disallowedReCache = new Map<string, RegExp>()

function disallowedRe(decimal: string) {
	let re = disallowedReCache.get(decimal)

	if (re === undefined) {
		re = new RegExp(`[^\\d\\-${escapeRegExp(decimal)}]`, 'g')

		disallowedReCache.set(decimal, re)
	}

	return re
}

export function isMeaningful(c: string, decimal: string) {
	return (c >= '0' && c <= '9') || c === '-' || c === decimal
}

// Collapses every decimal separator after the first, keeping a single split
// point between the integer and fraction segments.
function collapseExtraDecimals(value: string, decimal: string) {
	const firstDecimal = value.indexOf(decimal)

	if (firstDecimal < 0) return value

	const split = firstDecimal + decimal.length

	return value.slice(0, split) + value.slice(split).replace(separatorRe(decimal), '')
}

// Strips redundant leading zeros and applies locale digit grouping. An empty
// integer part renders as '0' only when a fraction follows, else stays empty.
function groupIntegerPart(intPart: string, hasFraction: boolean, locale: string | undefined) {
	const trimmed = intPart.replace(/^0+(?=\d)/, '')

	if (trimmed === '') return hasFraction ? '0' : ''

	const n = Number(trimmed)

	return Number.isFinite(n)
		? // `numberingSystem: 'latn'` keeps grouped output in ASCII digits so the
			// editing parser (which only recognizes 0-9) and the caret restore stay
			// aligned in non-latn-default locales (ar-EG, fa-IR, ne-NP, bn-IN).
			n.toLocaleString(locale, {
				useGrouping: true,
				maximumFractionDigits: 0,
				numberingSystem: 'latn',
			})
		: trimmed
}

export function formatEditing(
	raw: string,
	locale: string | undefined,
	decimal: string,
	maxFractionDigits: number,
) {
	const withoutDisallowed = raw.replace(disallowedRe(decimal), '')

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

	return Number.isNaN(n) ? undefined : n
}
