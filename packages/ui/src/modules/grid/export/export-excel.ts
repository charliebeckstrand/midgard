'use client'

import type { GridColumn } from '../types'
import { downloadBlob } from './export-download'
import { rowsToHtmlTable } from './export-html-table'

/**
 * Serializes rows to an Excel-openable document: the shared HTML table,
 * wrapped in the minimal shell Excel recognizes via its
 * `urn:schemas-microsoft-com:office:excel` namespace. Not a real `.xlsx`
 * workbook — no styling, formulas, or multiple sheets — but it opens natively
 * in Excel, Numbers, and Sheets with no added dependency. Swappable for a real
 * writer later without touching anything outside this file (see the module's
 * `ROADMAP.md`).
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function rowsToExcelHtml<T>(columns: GridColumn<T>[], rows: T[]): string {
	return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body>${rowsToHtmlTable(columns, rows)}</body></html>`
}

/**
 * Triggers a client-side download of an Excel-openable `.xls` file.
 *
 * @param filename - Suggested download name (e.g. `grid.xls`).
 * @param html - The document, as produced by {@link rowsToExcelHtml}.
 * @internal
 */
export function downloadExcel(filename: string, html: string): void {
	downloadBlob(filename, [html], 'application/vnd.ms-excel')
}
