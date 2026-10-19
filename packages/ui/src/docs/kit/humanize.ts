import { capitalizeFirst } from '../../utilities/capitalize-first.ts'

/**
 * The words that keep a form of their own in a label (CONVENTIONS.md §13.2).
 * An acronym and a proper noun keep their capitals. A code word, such as a
 * CSS unit, an ARIA role, or an HTML tag, stays in lowercase.
 */
const WORDS: Readonly<Record<string, string>> = {
	alertdialog: 'alertdialog',
	api: 'API',
	csv: 'CSV',
	div: 'div',
	dvh: 'dvh',
	dvw: 'dvw',
	earth: 'Earth',
	hsl: 'HSL',
	hsla: 'HSLA',
	hsv: 'HSV',
	hsva: 'HSVA',
	html: 'HTML',
	id: 'ID',
	jcb: 'JCB',
	json: 'JSON',
	lch: 'LCH',
	ltr: 'LTR',
	oklch: 'OKLCH',
	pdf: 'PDF',
	rgb: 'RGB',
	rgba: 'RGBA',
	rtl: 'RTL',
	span: 'span',
	svg: 'SVG',
	svh: 'svh',
	unionpay: 'UnionPay',
	url: 'URL',
	usa: 'USA',
}

/**
 * An identifier or a file name as words in sentence case: `groupTotalRow`
 * gives `Group total row`, and `with-icon` gives `With icon`. A word of
 * {@link WORDS} keeps its own form, so `compound-api` gives `Compound API`.
 * A value with no lowercase letter, or with a character that an identifier
 * does not have, reads as written, such as `MM/DD/YYYY` or `16/9`.
 */
export function humanize(identifier: string): string {
	if (!/[a-z]/.test(identifier) || !/^[A-Za-z0-9_-]+$/.test(identifier)) return identifier

	const words = identifier
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.toLowerCase()
		.split(' ')

	const [first = '', ...rest] = words

	const kept = WORDS[first]

	return [kept ?? capitalizeFirst(first), ...rest.map((word) => WORDS[word] ?? word)].join(' ')
}
