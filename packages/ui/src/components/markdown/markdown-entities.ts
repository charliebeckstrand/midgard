/**
 * The named references that the decoder knows. The full HTML list has more
 * than 2,000 names, and its table is too large for the eager bundle that
 * Markdown is in. This set holds the five XML names, the space, and the
 * typography and symbols that prose uses. A name outside the set stays as
 * text, as an unknown name does in CommonMark.
 */
const NAMED: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	copy: '©',
	reg: '®',
	trade: '™',
	hellip: '…',
	mdash: '—',
	ndash: '–',
	lsquo: '‘',
	rsquo: '’',
	ldquo: '“',
	rdquo: '”',
	laquo: '«',
	raquo: '»',
	middot: '·',
	bull: '•',
	deg: '°',
	times: '×',
	divide: '÷',
	plusmn: '±',
	ne: '≠',
	le: '≤',
	ge: '≥',
	infin: '∞',
	larr: '←',
	rarr: '→',
	uarr: '↑',
	darr: '↓',
	harr: '↔',
	euro: '€',
	pound: '£',
	yen: '¥',
	cent: '¢',
	sect: '§',
	para: '¶',
}

/** A reference that a semicolon ends: decimal, hexadecimal, or named. */
const REFERENCE = /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,31}));/g

/**
 * The character of a numeric reference. Zero, a surrogate, and a code point
 * past U+10FFFF become U+FFFD, as CommonMark specifies.
 */
function fromCodePoint(codePoint: number): string {
	const invalid =
		codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)

	return String.fromCodePoint(invalid ? 0xfffd : codePoint)
}

/**
 * Text with its entity references decoded: each decimal and hexadecimal
 * reference, and each named reference in the known set. A reference must end
 * in a semicolon. A name outside the set stays as it is.
 *
 * @internal
 */
export function decodeEntities(text: string): string {
	if (!text.includes('&')) return text

	return text.replace(REFERENCE, (reference, decimal, hex, name) => {
		if (decimal !== undefined) return fromCodePoint(Number.parseInt(decimal, 10))

		if (hex !== undefined) return fromCodePoint(Number.parseInt(hex, 16))

		return NAMED[name] ?? reference
	})
}
