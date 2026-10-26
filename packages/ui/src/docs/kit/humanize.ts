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
 * Tells if a value is a word that {@link humanize} reads, such as the value
 * `bottom-start` of a prop, which gets a translated option. A number and a
 * value with no word, such as `16/9` or `MM/DD/YYYY`, read as written in each
 * language.
 */
export function isWord(value: unknown): value is string {
	return typeof value === 'string' && /[a-z]/.test(value) && /^[A-Za-z0-9_-]+$/.test(value)
}

/**
 * An identifier or a file name as words in sentence case: `groupTotalRow`
 * gives `Group total row`, and `with-icon` gives `With icon`. A word of
 * {@link WORDS} keeps its own form, so `compound-api` gives `Compound API`.
 * A value that is not a word ({@link isWord}) reads as written, such as
 * `MM/DD/YYYY` or `16/9`.
 */
export function humanize(identifier: string): string {
	if (!isWord(identifier)) return identifier

	const words = identifier
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.toLowerCase()
		.split(' ')

	const [first = '', ...rest] = words

	const kept = WORDS[first]

	return [kept ?? capitalizeFirst(first), ...rest.map((word) => WORDS[word] ?? word)].join(' ')
}
