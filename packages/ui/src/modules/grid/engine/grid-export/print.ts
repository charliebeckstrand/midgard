import { printInHiddenFrame } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { rowsToHtmlTable } from './html-table'

/**
 * Wraps rows' HTML table (see {@link rowsToHtmlTable}) in a minimal print
 * document: a light table/border reset so the printed rows aren't bare of
 * rules.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function rowsToPrintHtml<T>(columns: GridColumn<T>[], rows: T[]): string {
	return `<!doctype html><html><head><meta charset="utf-8" /><style>
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
</style></head><body>${rowsToHtmlTable(columns, rows)}</body></html>`
}

/**
 * Opens the browser print dialog over `rows` through a hidden iframe.
 *
 * @remarks No recovery is wired: the grid builds its own markup, so a frame that
 * cannot print has nothing to fall back to and the failure propagates. See
 * {@link printInHiddenFrame}.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function printRows<T>(columns: GridColumn<T>[], rows: T[]) {
	printInHiddenFrame({
		prepare: (iframe) => {
			iframe.srcdoc = rowsToPrintHtml(columns, rows)
		},
	})
}
