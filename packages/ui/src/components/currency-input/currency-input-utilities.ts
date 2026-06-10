export function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Editing regexes are cached by separator: separators vary by locale, and global
// regexes are shared safely because String.replace resets lastIndex after each call.
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

export function formatEditing(
	raw: string,
	locale: string | undefined,
	decimal: string,
	maxFractionDigits: number,
) {
	const decRe = separatorRe(decimal)

	const allowed = disallowedRe(decimal)

	let cleaned = raw.replace(allowed, '')

	const negative = cleaned.startsWith('-')

	cleaned = cleaned.replace(/-/g, '')

	const firstDec = cleaned.indexOf(decimal)

	if (firstDec >= 0) {
		cleaned =
			cleaned.slice(0, firstDec + decimal.length) +
			cleaned.slice(firstDec + decimal.length).replace(decRe, '')
	}

	let [intPart = '', fracPart] = cleaned.split(decimal)

	intPart = intPart.replace(/^0+(?=\d)/, '')

	let formattedInt: string

	if (intPart === '') {
		formattedInt = fracPart !== undefined ? '0' : ''
	} else {
		const n = Number(intPart)

		formattedInt = Number.isFinite(n)
			? n.toLocaleString(locale, { useGrouping: true, maximumFractionDigits: 0 })
			: intPart
	}

	let result = (negative ? '-' : '') + formattedInt

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
