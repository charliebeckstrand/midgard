export function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isMeaningful(c: string, decimal: string) {
	return (c >= '0' && c <= '9') || c === '-' || c === decimal
}

export function countMeaningful(s: string, end: number, decimal: string) {
	const limit = Math.min(end, s.length)

	let count = 0

	for (let i = 0; i < limit; i++) if (isMeaningful(s.charAt(i), decimal)) count++

	return count
}

export function cursorForCount(s: string, target: number, decimal: string) {
	if (target <= 0) return 0

	let count = 0

	for (let i = 0; i < s.length; i++) {
		if (isMeaningful(s.charAt(i), decimal)) {
			count++

			if (count === target) return i + 1
		}
	}

	return s.length
}

export function formatEditing(
	raw: string,
	locale: string | undefined,
	decimal: string,
	maxFractionDigits: number,
) {
	const decRe = new RegExp(escapeRegExp(decimal), 'g')

	const allowed = new RegExp(`[^\\d\\-${escapeRegExp(decimal)}]`, 'g')

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
	const groupRe = new RegExp(escapeRegExp(group), 'g')

	const normalized = text.replace(groupRe, '').replace(decimal, '.')

	if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
		return undefined
	}

	const n = Number(normalized)

	return Number.isNaN(n) ? undefined : n
}
