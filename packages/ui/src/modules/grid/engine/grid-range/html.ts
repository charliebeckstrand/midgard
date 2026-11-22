import { escapeMarkup } from '../grid-export/accessor'
import { guardField } from './tsv'

/** A line break in the text of a cell, in any of its three forms. */
const LINE_BREAK = /\r\n|\r|\n/g

/**
 * A line break inside a cell. Excel reads a bare `<br>` in a `<td>` as a new
 * row, and keeps a line break in the cell only with this style, which it
 * writes itself. Google Sheets and a document ignore the style.
 */
const CELL_BREAK = '<br style="mso-data-placement:same-cell">'

/**
 * The opening tag of a cell. HTML collapses a run of spaces, a tab, and a
 * space at either end of a text, so a paste of the table would change the text
 * of the cell. `pre-wrap` keeps the text as the cell holds it, as the TSV does.
 * The style sits on each cell, because a spreadsheet reads the style of a cell
 * and not of the table.
 */
const CELL_OPEN = '<td style="white-space:pre-wrap">'

/**
 * The HTML table of a block of cells, for the `text/html` part of a copy: one
 * row for each row of the block, and no header row, as a spreadsheet copies a
 * range. A document or a mail keeps the table on a paste, where the TSV gives
 * only text. Each cell takes the formula guard of the TSV ({@link guardField})
 * and the markup escape of the HTML export. Each cell keeps its spaces
 * ({@link CELL_OPEN}), and a line break in a cell becomes a `<br>` that stays
 * in the cell ({@link CELL_BREAK}). @internal
 */
export function toHtmlTable(block: readonly (readonly string[])[]): string {
	const rows = block.map(
		(fields) =>
			`<tr>${fields
				.map(
					(field) =>
						`${CELL_OPEN}${escapeMarkup(guardField(field)).replace(LINE_BREAK, CELL_BREAK)}</td>`,
				)
				.join('')}</tr>`,
	)

	return `<table><tbody>${rows.join('')}</tbody></table>`
}
