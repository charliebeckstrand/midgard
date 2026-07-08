import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { downloadExcel, rowsToXlsx } from '../../modules/grid/export/export-excel'
import { rowsToHtmlTable } from '../../modules/grid/export/export-html-table'
import { printRows, rowsToPrintHtml } from '../../modules/grid/export/export-print'

type Row = { id: number; name: string; role: string }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
]

const rows: Row[] = [
	{ id: 1, name: 'Alice', role: 'Developer' },
	{ id: 2, name: 'Bob & Co', role: 'Designer' },
]

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
	const sheetXml = (workbook: Uint8Array) =>
		strFromU8(unzipSync(workbook)['xl/worksheets/sheet1.xml'] as Uint8Array)

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

	it('serializes finite numbers as native numeric cells', () => {
		type Item = { id: number; count: number }

		const itemColumns: GridColumn<Item>[] = [
			{ id: 'count', title: 'Count', cell: (row) => row.count, value: (row) => row.count },
		]

		const sheet = sheetXml(rowsToXlsx(itemColumns, [{ id: 1, count: 42 }]))

		expect(sheet).toContain('<c r="A2"><v>42</v></c>')
	})
})

describe('downloadExcel', () => {
	it('wraps the workbook in an xlsx-typed blob and clicks an object-URL anchor', async () => {
		// URL.createObjectURL/revokeObjectURL are stubbed in jsdom-stubs.ts; spy on
		// them so restoreMocks auto-reverts (no raw reassignment to leak).
		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		downloadExcel('grid.xlsx', rowsToXlsx(columns, rows))

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

		expect(click).toHaveBeenCalledTimes(1)

		// The object URL is revoked on the next macrotask (not synchronously, which
		// can abort the download), so flush timers before asserting.
		expect(revokeObjectURL).not.toHaveBeenCalled()

		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

		click.mockRestore()
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
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printRows(columns, rows)

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		expect(iframe.tagName).toBe('IFRAME')

		expect(iframe.srcdoc).toBe(rowsToPrintHtml(columns, rows))

		appendChild.mockRestore()
	})

	it('cleans up the iframe on load when contentWindow is unavailable', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printRows(columns, rows)

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		Object.defineProperty(iframe, 'contentWindow', { value: null, configurable: true })

		iframe.dispatchEvent(new Event('load'))

		expect(iframe.parentNode).toBeNull()

		appendChild.mockRestore()
	})

	it('focuses and prints through the iframe window, deferring cleanup to afterprint', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printRows(columns, rows)

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		const win = { addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn() }

		Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true })

		iframe.dispatchEvent(new Event('load'))

		expect(win.focus).toHaveBeenCalled()

		expect(win.print).toHaveBeenCalled()

		expect(win.addEventListener).toHaveBeenCalledWith('afterprint', expect.any(Function))

		// Cleanup is deferred to the afterprint event, so the iframe is still attached.
		expect(iframe.parentNode).not.toBeNull()

		iframe.remove()

		appendChild.mockRestore()
	})

	it('reclaims the iframe when the window regains focus and afterprint never fires', () => {
		const appendChild = vi.spyOn(document.body, 'appendChild')

		printRows(columns, rows)

		const iframe = appendChild.mock.calls.at(-1)?.[0] as HTMLIFrameElement

		const win = { addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn() }

		Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true })

		iframe.dispatchEvent(new Event('load'))

		// afterprint never fires; the print dialog closing returns focus to the window.
		expect(iframe.parentNode).not.toBeNull()

		window.dispatchEvent(new Event('focus'))

		expect(iframe.parentNode).toBeNull()

		appendChild.mockRestore()
	})
})
