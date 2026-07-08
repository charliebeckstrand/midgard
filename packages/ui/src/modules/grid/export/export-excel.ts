'use client'

import { strToU8, zipSync } from 'fflate'
import type { GridColumn } from '../types'
import { cellText, exportFields } from './export-accessor'
import { downloadBlob } from './export-download'

/** Escapes the five XML-significant characters for worksheet text. @internal */
function xmlEscape(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}

/** A1-style column letter for a 0-based index (0 → A, 25 → Z, 26 → AA). @internal */
function columnLetter(index: number): string {
	let letters = ''

	for (let n = index; n >= 0; n = Math.floor(n / 26) - 1) {
		letters = String.fromCharCode(65 + (n % 26)) + letters
	}

	return letters
}

/**
 * One worksheet cell: a finite number serializes as a native numeric cell (so
 * Excel can aggregate it), everything else as inline text through the shared
 * {@link cellText} stringification the other export types use.
 *
 * @internal
 */
function sheetCell(reference: string, value: unknown): string {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return `<c r="${reference}"><v>${value}</v></c>`
	}

	const text = cellText(value)

	if (text === '') return `<c r="${reference}"/>`

	return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

/**
 * Serializes rows to a real `.xlsx` workbook (a zip of minimal OOXML parts):
 * one worksheet holding a header row of column labels and one row per datum,
 * numbers as native numeric cells and everything else as inline strings. The
 * columns and cell values come from the same export accessors CSV and print
 * read, so every export type emits identical data. Replaces the module's
 * former Excel-flavored HTML `.xls`, which opened with a format warning and
 * carried no cell types.
 *
 * Public alongside {@link downloadExcel} so a custom
 * {@link GridExportTypeConfig.onExport | onExport} override can reuse the
 * built-in serialization under its own filename:
 * `downloadExcel('report.xlsx', rowsToXlsx(context.columns, context.rows))`.
 *
 * @typeParam T - Shape of a single row.
 */
export function rowsToXlsx<T>(columns: GridColumn<T>[], rows: T[]): Uint8Array {
	const fields = exportFields(columns)

	const sheetRows: string[] = []

	const headerCells = fields
		.map((field, column) => sheetCell(`${columnLetter(column)}1`, field.label))
		.join('')

	sheetRows.push(`<row r="1">${headerCells}</row>`)

	rows.forEach((row, index) => {
		const reference = index + 2

		const cells = fields
			.map((field, column) => sheetCell(`${columnLetter(column)}${reference}`, field.accessor(row)))
			.join('')

		sheetRows.push(`<row r="${reference}">${cells}</row>`)
	})

	const sheet = `${XML_DECLARATION}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows.join('')}</sheetData></worksheet>`

	const workbook = `${XML_DECLARATION}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`

	const workbookRels = `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`

	const rootRels = `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

	const contentTypes = `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`

	return zipSync({
		'[Content_Types].xml': strToU8(contentTypes),
		'_rels/.rels': strToU8(rootRels),
		'xl/workbook.xml': strToU8(workbook),
		'xl/_rels/workbook.xml.rels': strToU8(workbookRels),
		'xl/worksheets/sheet1.xml': strToU8(sheet),
	})
}

/**
 * Triggers a client-side download of a real `.xlsx` workbook.
 *
 * @param filename - Suggested download name (e.g. `grid.xlsx`).
 * @param workbook - The zipped workbook bytes, as produced by {@link rowsToXlsx}.
 */
export function downloadExcel(filename: string, workbook: Uint8Array): void {
	downloadBlob(
		filename,
		[workbook as BlobPart],
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	)
}
