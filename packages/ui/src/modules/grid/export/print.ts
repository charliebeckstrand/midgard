'use client'

import type { GridColumn } from '../types'
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
 * Opens the browser print dialog over `rows` through a hidden iframe, mirroring
 * `printPdf` (see `components/pdf-viewer/pdf-viewer-utilities`): cleans up on
 * `afterprint`, with a window-`focus` backstop for browsers that never fire it
 * (e.g. older Safari) or when the dialog is dismissed.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function printRows<T>(columns: GridColumn<T>[], rows: T[]): void {
	const iframe = document.createElement('iframe')

	iframe.style.position = 'fixed'
	iframe.style.right = '0'
	iframe.style.bottom = '0'
	iframe.style.width = '0'
	iframe.style.height = '0'
	iframe.style.border = '0'

	iframe.setAttribute('aria-hidden', 'true')

	let cleaned = false

	const cleanup = () => {
		if (cleaned) return

		cleaned = true

		window.removeEventListener('focus', cleanup)

		iframe.remove()
	}

	iframe.addEventListener('load', () => {
		const win = iframe.contentWindow

		if (!win) {
			cleanup()

			return
		}

		win.addEventListener('afterprint', cleanup)

		// Backstop for browsers that never fire `afterprint` (e.g. older Safari) or
		// where the user dismisses the dialog: reclaims the iframe when focus
		// returns to the main window after the print dialog closes.
		window.addEventListener('focus', cleanup, { once: true })

		win.focus()
		win.print()
	})

	iframe.srcdoc = rowsToPrintHtml(columns, rows)

	document.body.appendChild(iframe)
}
