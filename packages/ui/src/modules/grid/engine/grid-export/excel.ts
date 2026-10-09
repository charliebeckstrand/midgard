import { strToU8, Zip, ZipDeflate } from 'fflate'
import { downloadBlob } from '../../../../core/download-blob'
import type { GridColumn } from '../../types'
import { cellText, escapeXml, exportFields } from './accessor'

/** A1-style column letter for a 0-based index (0 → A, 25 → Z, 26 → AA). @internal */
function columnLetter(index: number): string {
	let letters = ''

	for (let n = index; n >= 0; n = Math.floor(n / 26) - 1) {
		letters = String.fromCharCode(65 + (n % 26)) + letters
	}

	return letters
}

/**
 * One worksheet cell. A finite number serializes as a native numeric cell, so
 * Excel can aggregate it. Everything else serializes as inline text, through the
 * shared {@link cellText} stringification the other export types use.
 *
 * @internal
 */
function sheetCell(reference: string, value: unknown): string {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return `<c r="${reference}"><v>${value}</v></c>`
	}

	const text = cellText(value)

	if (text === '') return `<c r="${reference}"/>`

	return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeSheetText(text)}</t></is></c>`
}

/** Text that reads as an OOXML escape, such as `_x0041_`. */
const OOXML_ESCAPE = /_x([0-9A-Fa-f]{4})_/g

/**
 * Escapes cell text for a worksheet. A code point that XML forbids (see
 * `isForbidden`) makes the sheet invalid XML, so it becomes the OOXML escape
 * `_xHHHH_`, which Excel reads back as the character. Text that already reads
 * as such an escape keeps its underscore as `_x005F_`, so Excel does not
 * decode it.
 *
 * @internal
 */
export function escapeSheetText(text: string): string {
	return escapeXml(encodeForbidden(text.replace(OOXML_ESCAPE, '_x005F_x$1_')))
}

function isHighSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff
}

function isLowSurrogate(code: number): boolean {
	return code >= 0xdc00 && code <= 0xdfff
}

/**
 * Whether the code unit at `index` is one that XML 1.0 forbids in text: a C0
 * control other than tab, line feed, and carriage return, a lone surrogate, or
 * U+FFFE or U+FFFF.
 */
function isForbidden(text: string, index: number): boolean {
	const code = text.charCodeAt(index)

	if (code < 0x20) return code !== 0x09 && code !== 0x0a && code !== 0x0d

	if (code === 0xfffe || code === 0xffff) return true

	// A high surrogate needs a low one after it, and a low one a high one before.
	if (isHighSurrogate(code)) return !isLowSurrogate(text.charCodeAt(index + 1))

	if (isLowSurrogate(code)) return !isHighSurrogate(text.charCodeAt(index - 1))

	return false
}

/** `text` with each forbidden code unit (see {@link isForbidden}) as `_xHHHH_`. */
function encodeForbidden(text: string): string {
	let out = ''

	let from = 0

	for (let index = 0; index < text.length; index++) {
		if (!isForbidden(text, index)) continue

		const hex = text.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0')

		out += `${text.slice(from, index)}_x${hex}_`

		from = index + 1
	}

	return from === 0 ? text : out + text.slice(from)
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

const WORKBOOK = `${XML_DECLARATION}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`

const WORKBOOK_RELS = `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`

const ROOT_RELS = `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const CONTENT_TYPES = `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`

/** The parts of a workbook that do not change with the data, by path in the zip. */
const FIXED_PARTS: [string, string][] = [
	['[Content_Types].xml', CONTENT_TYPES],
	['_rels/.rels', ROOT_RELS],
	['xl/workbook.xml', WORKBOOK],
	['xl/_rels/workbook.xml.rels', WORKBOOK_RELS],
]

/**
 * The length of worksheet XML, in UTF-16 code units, that the writer
 * compresses in one step. In Chromium, one step of this length takes less
 * than the 50 ms of a long task, so a caller that yields between steps keeps
 * the page responsive.
 */
const STEP_LENGTH = 1 << 19

/**
 * Writes a workbook in steps. The worksheet XML is compressed as it is made,
 * one {@link STEP_LENGTH} at a time, and the generator yields after each step.
 * It returns the zipped workbook bytes.
 */
function* writeXlsx<T>(
	columns: GridColumn<T>[],
	rows: readonly T[],
): Generator<undefined, Uint8Array, undefined> {
	const fields = exportFields(columns)

	const chunks: Uint8Array[] = []

	const zip = new Zip((error, chunk) => {
		if (error) throw error

		chunks.push(chunk)
	})

	for (const [path, xml] of FIXED_PARTS) {
		const part = new ZipDeflate(path)

		zip.add(part)

		part.push(strToU8(xml), true)
	}

	const sheet = new ZipDeflate('xl/worksheets/sheet1.xml')

	zip.add(sheet)

	const headerCells = fields
		.map((field, column) => sheetCell(`${columnLetter(column)}1`, field.label))
		.join('')

	let xml = `${XML_DECLARATION}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${headerCells}</row>`

	for (const [index, row] of rows.entries()) {
		const reference = index + 2

		const cells = fields
			.map((field, column) => sheetCell(`${columnLetter(column)}${reference}`, field.accessor(row)))
			.join('')

		xml += `<row r="${reference}">${cells}</row>`

		if (xml.length < STEP_LENGTH) continue

		sheet.push(strToU8(xml))

		xml = ''

		yield
	}

	sheet.push(strToU8(`${xml}</sheetData></worksheet>`), true)

	zip.end()

	const workbook = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0))

	let offset = 0

	for (const chunk of chunks) {
		workbook.set(chunk, offset)

		offset += chunk.length
	}

	return workbook
}

/**
 * Serializes rows to a real `.xlsx` workbook, a zip of minimal OOXML parts.
 * One worksheet holds a header row of column labels and one row per datum.
 * Numbers become native numeric cells, everything else inline strings. The
 * columns and cell values come from the same export accessors CSV and print
 * read, so every export type emits identical data. Replaces the module's
 * former Excel-flavored HTML `.xls`, which opened with a format warning and
 * carried no cell types.
 *
 * @typeParam T - Shape of a single row.
 */
export function rowsToXlsx<T>(columns: GridColumn<T>[], rows: readonly T[]): Uint8Array {
	const writer = writeXlsx(columns, rows)

	for (;;) {
		const step = writer.next()

		if (step.done) return step.value
	}
}

/**
 * The workbook of {@link rowsToXlsx}, written over many tasks. Between two
 * steps of the writer, it gives the main thread back to the browser, so a
 * large grid does not freeze the page while it compresses. It does not use a
 * worker, because a strict `worker-src` policy can block one.
 *
 * @internal
 */
export async function rowsToXlsxInSteps<T>(
	columns: GridColumn<T>[],
	rows: readonly T[],
): Promise<Uint8Array> {
	const writer = writeXlsx(columns, rows)

	for (;;) {
		const step = writer.next()

		if (step.done) return step.value

		await nextTask()
	}
}

/**
 * Resolves in a new task. A message to a channel does this without the 4 ms
 * delay that the browser adds to a nested `setTimeout`.
 */
function nextTask(): Promise<void> {
	return new Promise((resolve) => {
		const channel = new MessageChannel()

		channel.port1.onmessage = () => {
			channel.port1.close()

			resolve()
		}

		channel.port2.postMessage(null)
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
		new Blob([workbook as BlobPart], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		}),
		filename,
	)
}
