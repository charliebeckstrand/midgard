import { escapeMarkup } from '../grid-export/accessor'
import { guardField } from './tsv'

/** A line break in the text of a cell, in any of its three forms. */
const LINE_BREAK = /\r\n|\r|\n/g

/**
 * The HTML table of a block of cells, for the `text/html` part of a copy: one
 * row for each row of the block, and no header row, as a spreadsheet copies a
 * range. A document or a mail keeps the table on a paste, where the TSV gives
 * only text. Each cell takes the formula guard of the TSV ({@link guardField})
 * and the markup escape of the HTML export. A line break in a cell becomes a
 * `<br>`, which a spreadsheet reads as a line break in the cell. @internal
 */
export function toHtmlTable(block: readonly (readonly string[])[]): string {
	const rows = block.map(
		(fields) =>
			`<tr>${fields
				.map((field) => `<td>${escapeMarkup(guardField(field)).replace(LINE_BREAK, '<br>')}</td>`)
				.join('')}</tr>`,
	)

	return `<table><tbody>${rows.join('')}</tbody></table>`
}
