import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { cellText } from '../../modules/grid/engine/grid-export/accessor'
import { rowsToCsv } from '../../modules/grid/engine/grid-export/csv'
import { downloadExcel, rowsToXlsx } from '../../modules/grid/engine/grid-export/excel'
import { rowsToHtmlTable } from '../../modules/grid/engine/grid-export/html-table'
import { printRows, rowsToPrintHtml } from '../../modules/grid/engine/grid-export/print'
import { captureAppended } from '../helpers/capture-appended'
import { captureDownload } from '../helpers/capture-download'
import { tick } from '../helpers/frames'

type Row = { id: number; name: string; role: string }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
]

const rows: Row[] = [
	{ id: 1, name: 'Alice', role: 'Developer' },
	{ id: 2, name: 'Bob & Co', role: 'Designer' },
]

/** The XML of the one sheet of a workbook. */
const sheetXml = (workbook: Uint8Array) =>
	strFromU8(unzipSync(workbook)['xl/worksheets/sheet1.xml'] as Uint8Array)

describe('rowsToHtmlTable', () => {
	it('renders a header row of labels and one row per datum', () => {
		expect(rowsToHtmlTable(columns, rows)).toBe(
			'<table><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody>' +
				'<tr><td>Alice</td><td>Developer</td></tr>' +
				'<tr><td>Bob &amp; Co</td><td>Designer</td></tr>' +
				'</tbody></table>',
		)
	})

	it('escapes HTML-significant characters in cell text', () => {
		type Item = { id: number; label: string }

		const itemColumns: GridColumn<Item>[] = [
			{ id: 'label', title: 'Label', cell: (row) => row.label, value: (row) => row.label },
		]

		expect(rowsToHtmlTable(itemColumns, [{ id: 1, label: '<b>bold</b>' }])).toContain(
			'&lt;b&gt;bold&lt;/b&gt;',
		)
	})

	it('emits the header alone for an empty row set', () => {
		expect(rowsToHtmlTable(columns, [])).toBe(
			'<table><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody></tbody></table>',
		)
	})
})

describe('rowsToXlsx', () => {
	it('zips the OOXML parts a workbook needs', () => {
		const parts = Object.keys(unzipSync(rowsToXlsx(columns, rows)))

		expect(parts).toEqual(
			expect.arrayContaining([
				'[Content_Types].xml',
				'_rels/.rels',
				'xl/workbook.xml',
				'xl/_rels/workbook.xml.rels',
				'xl/worksheets/sheet1.xml',
			]),
		)
	})

	it('emits a header row of labels and one escaped inline-string row per datum', () => {
		const sheet = sheetXml(rowsToXlsx(columns, rows))

		expect(sheet).toContain(
			'<row r="1"><c r="A1" t="inlineStr"><is><t xml:space="preserve">Name</t></is></c>',
		)

		expect(sheet).toContain('<t xml:space="preserve">Alice</t>')

		// XML-significant characters in cell text are escaped.
		expect(sheet).toContain('<t xml:space="preserve">Bob &amp; Co</t>')
	})

	it('encodes the characters that XML forbids, so the sheet stays valid XML', () => {
		type Item = { id: number; label: string }

		const itemColumns: GridColumn<Item>[] = [
			{ id: 'label', title: 'Label', cell: (row) => row.label, value: (row) => row.label },
		]

		const labels = ['a\u0001b', '_x0041_', 'lone \uD800 half', 'pair \u{1F600}', 'tab\tkept']

		const sheet = sheetXml(
			rowsToXlsx(
				itemColumns,
				labels.map((label, id) => ({ id, label })),
			),
		)

		const parsed = new DOMParser().parseFromString(sheet, 'application/xml')

		expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0)

		expect(sheet).toContain('<t xml:space="preserve">a_x0001_b</t>')

		// Text that reads as an escape keeps its underscore, so Excel shows it as typed.
		expect(sheet).toContain('<t xml:space="preserve">_x005F_x0041_</t>')

		expect(sheet).toContain('<t xml:space="preserve">lone _xD800_ half</t>')

		expect(sheet).toContain('<t xml:space="preserve">pair \u{1F600}</t>')

		expect(sheet).toContain('<t xml:space="preserve">tab\tkept</t>')
	})

	it('serializes finite numbers as native numeric cells', () => {
		type Item = { id: number; count: number }

		const itemColumns: GridColumn<Item>[] = [
			{ id: 'count', title: 'Count', cell: (row) => row.count, value: (row) => row.count },
		]

		const sheet = sheetXml(rowsToXlsx(itemColumns, [{ id: 1, count: 42 }]))

		expect(sheet).toContain('<c r="A2"><v>42</v></c>')
	})
})

describe('cellText', () => {
	type Item = { id: number; when: unknown }

	const itemColumns: GridColumn<Item>[] = [
		{ id: 'when', title: 'When', cell: () => null, value: (row) => row.when },
	]

	const date = new Date(Date.UTC(2026, 8, 29, 14, 30))

	it('writes a date as ISO 8601, and an invalid date as empty', () => {
		expect(cellText(date)).toBe('2026-09-29T14:30:00.000Z')

		expect(cellText(new Date(Number.NaN))).toBe('')
	})

	it('writes a plain object or an array as JSON', () => {
		expect(cellText({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}')

		expect(cellText([1, 'two'])).toBe('[1,"two"]')
	})

	it('keeps String() for other values, and nullish as empty', () => {
		expect(cellText(42)).toBe('42')

		expect(cellText(true)).toBe('true')

		expect(cellText(null)).toBe('')

		expect(cellText(undefined)).toBe('')
	})

	it('gives the same text to CSV, HTML, and XLSX', () => {
		const items = [
			{ id: 1, when: date },
			{ id: 2, when: { a: 1 } },
		]

		expect(rowsToCsv(itemColumns, items)).toBe('When\r\n2026-09-29T14:30:00.000Z\r\n"{""a"":1}"')

		expect(rowsToHtmlTable(itemColumns, items)).toContain(
			'<td>2026-09-29T14:30:00.000Z</td></tr><tr><td>{"a":1}</td>',
		)

		const sheet = sheetXml(rowsToXlsx(itemColumns, items))

		expect(sheet).toContain('<t xml:space="preserve">2026-09-29T14:30:00.000Z</t>')

		expect(sheet).toContain('<t xml:space="preserve">{&quot;a&quot;:1}</t>')
	})
})

describe('downloadExcel', () => {
	it('wraps the workbook in an xlsx-typed blob and clicks an object-URL anchor', async () => {
		const download = captureDownload()

		downloadExcel('grid.xlsx', rowsToXlsx(columns, rows))

		expect(download.createObjectURL).toHaveBeenCalledTimes(1)

		const blob = download.blob()

		expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

		expect(download.click).toHaveBeenCalledTimes(1)

		// The object URL is revoked on the next macrotask (not synchronously, which
		// can abort the download), so flush timers before asserting.
		expect(download.revokeObjectURL).not.toHaveBeenCalled()

		await tick()

		expect(download.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
	})
})

describe('rowsToPrintHtml', () => {
	it('wraps the HTML table in a printable document', () => {
		const html = rowsToPrintHtml(columns, rows)

		expect(html).toContain('<!doctype html>')

		expect(html).toContain(rowsToHtmlTable(columns, rows))
	})
})

describe('printRows', () => {
	it('appends a hidden iframe carrying the printable document as srcdoc', () => {
		const iframe = captureAppended(() => printRows(columns, rows), 'iframe')

		expect(iframe.srcdoc).toBe(rowsToPrintHtml(columns, rows))
	})

	// The frame lifecycle itself is `printInHiddenFrame`'s, and `print-frame.test.ts`
	// drives it. What is the grid's own is the pair below: `srcdoc` above, and no
	// `onFail` here. The remaining arm of that gate — a blocked `print()`
	// propagating rather than being swallowed — is not assertable in jsdom, which
	// turns a throwing listener into an unhandled error the runner fails on.
	it('wires no new-tab fallback, but the frame is still reclaimed', () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null)

		const iframe = captureAppended(() => printRows(columns, rows), 'iframe')

		iframe.dispatchEvent(new Event('error'))

		expect(open).not.toHaveBeenCalled()

		expect(iframe.parentNode).toBeNull()
	})
})
