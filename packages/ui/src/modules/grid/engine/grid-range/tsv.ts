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
