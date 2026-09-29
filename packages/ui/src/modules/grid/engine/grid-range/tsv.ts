import { neutralizeFormula } from '../../../../utilities/export-output'

/** A field that TSV must quote: it holds a tab, a line break, or a double quote. */
const NEEDS_QUOTES = /[\t\r\n"]/

/**
 * One cell as a TSV field. A field that holds a tab, a line break, or a double
 * quote goes in double quotes, with each quote doubled, as a spreadsheet
 * writes it. A field that a spreadsheet can run as a formula gets the export
 * guard first (see `neutralizeFormula`). @internal
 */
export function tsvField(value: string): string {
	const guarded = neutralizeFormula(value)

	return NEEDS_QUOTES.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded
}

/**
 * The TSV text of a block of cells: one line for each row, with the fields of
 * a row joined by tabs. @internal
 */
export function toTsv(block: readonly (readonly string[])[]): string {
	return block.map((row) => row.map(tsvField).join('\t')).join('\n')
}

/**
 * A text with the one guard apostrophe that {@link tsvField} adds taken off,
 * so a copy and a paste inside the grid give back the same text. An
 * apostrophe that the guard did not add stays. @internal
 */
export function unguardField(text: string): string {
	if (!text.startsWith("'")) return text

	const rest = text.slice(1)

	return neutralizeFormula(rest) === text ? rest : text
}

/** One line break at the end of a text, which a spreadsheet adds to a copy. */
const TRAILING_BREAK = /(?:\r\n|\n|\r)$/

/** The characters that end an unquoted field. */
const FIELD_END = /[\t\r\n]/g

/** The index of the next tab or line break at or after `from`, else the length of `text`. */
function fieldEnd(text: string, from: number): number {
	FIELD_END.lastIndex = from

	return FIELD_END.exec(text)?.index ?? text.length
}

/**
 * Reads the field that starts at `at`, and returns its text and the index of
 * the character after it. A field that starts with a double quote runs to the
 * next quote that is not doubled. Text after that quote, up to the end of the
 * field, joins the field, as a spreadsheet reads it. A quote with no end runs
 * to the end of the text.
 */
function readField(text: string, at: number): [string, number] {
	if (text[at] !== '"') {
		const end = fieldEnd(text, at)

		return [text.slice(at, end), end]
	}

	let value = ''

	let from = at + 1

	for (;;) {
		const quote = text.indexOf('"', from)

		if (quote === -1) return [value + text.slice(from), text.length]

		value += text.slice(from, quote)

		if (text[quote + 1] !== '"') {
			const end = fieldEnd(text, quote + 1)

			return [value + text.slice(quote + 1, end), end]
		}

		value += '"'

		from = quote + 2
	}
}

/**
 * The rows of fields of a TSV text, as a spreadsheet writes it to the
 * clipboard. A tab ends a field, and a line break (`\n`, `\r\n`, or `\r`) ends
 * a row. A field in double quotes can hold a tab, a line break, or a doubled
 * quote. One line break at the end is dropped, and an empty text gives no
 * rows. @internal
 */
export function parseTsv(text: string): string[][] {
	const body = text.replace(TRAILING_BREAK, '')

	if (body === '') return []

	const rows: string[][] = []

	let row: string[] = []

	let at = 0

	while (at <= body.length) {
		const [field, end] = readField(body, at)

		row.push(field)

		const next = body[end]

		at = next === '\r' && body[end + 1] === '\n' ? end + 2 : end + 1

		if (next === '\t') continue

		rows.push(row)

		row = []
	}

	return rows
}
