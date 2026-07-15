import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { downloadCsv, rowsToCsv } from '../../modules/grid/engine/grid-export/csv'
import { fireEvent, renderUI, screen, waitFor, within } from '../helpers'

describe('rowsToCsv', () => {
	type Row = { id: number; name: string; role: string }

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
	]

	it('emits a header row of labels and one row per datum', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
			{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
		]

		expect(rowsToCsv(columns, rows)).toBe('Name,Role\r\nAlice,Developer\r\nBob,Designer')
	})

	it('reads the value accessor, falling back to the row field by id', () => {
		// `role` has no value accessor: it falls back to row.role.
		const columns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				cell: (row) => row.name,
				value: (row) => row.name.toUpperCase(),
			},
			{ id: 'role', title: 'Role', cell: (row) => row.role },
		]

		expect(rowsToCsv(columns, [rows[0] as Row])).toBe('Name,Role\r\nALICE,Developer')
	})

	it('quotes fields carrying a comma, quote, or newline (RFC 4180)', () => {
		type Item = { id: number; label: string }

		const columns: GridColumn<Item>[] = [
			{ id: 'label', title: 'La,bel', cell: (row) => row.label, value: (row) => row.label },
		]

		const items: Item[] = [
			{ id: 1, label: 'a,b' },
			{ id: 2, label: 'quote " here' },
			{ id: 3, label: 'line\nbreak' },
		]

		expect(rowsToCsv(columns, items)).toBe('"La,bel"\r\n"a,b"\r\n"quote "" here"\r\n"line\nbreak"')
	})

	it('neutralizes formula-injection leads while preserving signed numbers', () => {
		type Item = { id: number; label: string }

		const columns: GridColumn<Item>[] = [
			{ id: 'label', title: 'Label', cell: (row) => row.label, value: (row) => row.label },
		]

		const items: Item[] = [
			{ id: 1, label: '=HYPERLINK("http://evil")' },
			{ id: 2, label: '@handle' },
			{ id: 3, label: '-2+3+cmd|calc' },
			{ id: 4, label: '-5' },
			{ id: 5, label: '+1.5e3' },
		]

		// Formula leads (`=`, `@`, and a signed non-number) are prefixed with a
		// quote — the `=` field also gets RFC-quoted for its comma — while the
		// genuine negative and positive numbers pass through untouched.
		expect(rowsToCsv(columns, items)).toBe(
			'Label\r\n"\'=HYPERLINK(""http://evil"")"\r\n\'@handle\r\n\'-2+3+cmd|calc\r\n-5\r\n+1.5e3',
		)
	})

	it('skips non-data columns (selection, actions) and blanks missing values', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'select', selectable: true },
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
			// No value, no matching field on the row: exports an empty field.
			{ id: 'missing', title: 'Missing', cell: () => null },
		]

		expect(rowsToCsv(columns, [rows[0] as Row])).toBe('Name,Missing\r\nAlice,')
	})

	it('emits the header alone for an empty row set', () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		]

		expect(rowsToCsv(columns, [])).toBe('Name')
	})
})

describe('downloadCsv', () => {
	it('wraps the CSV in a BOM-led blob and clicks an object-URL anchor', async () => {
		// jsdom-stubs.ts stubs URL.createObjectURL/revokeObjectURL, so vi.spyOn can
		// wrap them and restoreMocks auto-reverts — no manual save/restore, nothing
		// to leak across the worker.
		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

		const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		downloadCsv('grid.csv', 'A,B\r\n1,2')

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		expect(blob.type).toBe('text/csv;charset=utf-8')

		// The bytes lead with the UTF-8 BOM (EF BB BF) so spreadsheet apps detect
		// the encoding; `Blob.text()` decodes and strips that BOM, leaving the CSV.
		const bytes = new Uint8Array(await blob.arrayBuffer())

		expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])

		expect(await blob.text()).toBe('A,B\r\n1,2')

		expect(click).toHaveBeenCalledTimes(1)

		// The object URL is revoked on the next macrotask (not synchronously, which
		// can abort the download), so flush timers before asserting.
		expect(revokeObjectURL).not.toHaveBeenCalled()

		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

		click.mockRestore()
	})
})

describe('Grid export', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
	]

	const getKey = (row: Row) => row.id

	const rightClickHeader = (name: string) => {
		const node = screen
			.getAllByRole('columnheader')
			.find((element) => element.textContent?.includes(name))

		if (!node) throw new Error(`no header containing "${name}"`)

		fireEvent.contextMenu(node)
	}

	const openExportMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Export' }))

	// Spies the object-URL + anchor-click path a CSV download drives and returns
	// the `createObjectURL` spy; the global `restoreMocks` reverts both per test.
	const mockCsvDownload = () => {
		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		return createObjectURL
	}

	it('omits every export item and the toolbar button when exportable is false', () => {
		renderUI(<Grid exportable={false} columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: 'Export' })).toBeNull()

		rightClickHeader('Name')

		expect(screen.queryByRole('menuitem', { name: 'Export to CSV' })).toBeNull()
	})

	it('enables CSV and Excel (not print) by default with no exportable prop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to Excel' })).toBeInTheDocument()

		// Print stays opt-in — it opens the print dialog rather than downloading.
		expect(screen.queryByRole('menuitem', { name: 'Print' })).toBeNull()
	})

	it('enables the default CSV + Excel + print set for the boolean shorthand', () => {
		renderUI(<Grid exportable columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to Excel' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Print' })).toBeInTheDocument()
	})

	it('lists one item per action in the toolbar Export dropdown', () => {
		renderUI(<Grid exportable columns={columns} rows={rows} getKey={getKey} />)

		openExportMenu()

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to Excel' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Print' })).toBeInTheDocument()
	})

	it('narrows to an explicit subset of types', () => {
		renderUI(<Grid exportable={['csv']} columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Export to Excel' })).toBeNull()

		expect(screen.queryByRole('menuitem', { name: 'Print' })).toBeNull()
	})

	it('downloads the rows as CSV from the header menu', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(<Grid exportable={['csv']} columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		const text = await blob.text()

		expect(text).toContain('Name,Role')

		expect(text).toContain('Alice,Developer')

		expect(text).toContain('Bob,Designer')

		expect(click).toHaveBeenCalledTimes(1)

		click.mockRestore()
	})

	it('downloads the rows from the toolbar Export dropdown', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(<Grid exportable={['csv']} columns={columns} rows={rows} getKey={getKey} />)

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		expect(await blob.text()).toContain('Alice,Developer')

		click.mockRestore()
	})

	it('shares one tools toolbar with the column-manager button', () => {
		renderUI(
			<Grid
				columnManager={{ toolbarButton: true }}
				exportable
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

		const tools = screen.getByRole('toolbar', { name: 'Table tools' })

		expect(within(tools).getByRole('button', { name: 'Manage columns' })).toBeInTheDocument()

		expect(within(tools).getByRole('button', { name: 'Export' })).toBeInTheDocument()
	})

	it('exports only the selected rows when a selection is active', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set([2]) }}
			/>,
		)

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		const text = await blob.text()

		// Only Bob (id 2) is selected: the export keeps the header and drops the
		// unselected Alice.
		expect(text).toContain('Name,Role')

		expect(text).toContain('Bob,Designer')

		expect(text).not.toContain('Alice,Developer')

		click.mockRestore()
	})

	it('exports the selected rows from the cell context menu', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set([1]) }}
			/>,
		)

		const cell = screen.getAllByRole('cell').find((node) => node.textContent?.includes('Alice'))

		if (!cell) throw new Error('no cell containing "Alice"')

		fireEvent.contextMenu(cell)

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		const text = await blob.text()

		// Alice (id 1) is selected: the cell-menu export drops the unselected Bob.
		expect(text).toContain('Alice,Developer')

		expect(text).not.toContain('Bob,Designer')

		click.mockRestore()
	})

	it('falls back to every row when the selection is empty', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set<number>() }}
			/>,
		)

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		const text = await blob.text()

		expect(text).toContain('Alice,Developer')

		expect(text).toContain('Bob,Designer')

		click.mockRestore()
	})

	it("replaces a built-in type's behavior with an object entry's onExport", () => {
		const onExport = vi.fn()

		renderUI(
			<Grid exportable={[{ csv: { onExport } }]} columns={columns} rows={rows} getKey={getKey} />,
		)

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(onExport).toHaveBeenCalledTimes(1)

		// The grid resolves each column's `sortable` default before handing them to
		// the export context, so compare rows exactly and columns by id/value only.
		const context = onExport.mock.calls[0]?.[0]

		expect(context.rows).toEqual(rows)

		expect(context.columns.map((column: GridColumn<Row>) => column.id)).toEqual(['name', 'role'])
	})

	it('supports a custom export type via onExport, labeled generically', () => {
		const onExport = vi.fn()

		renderUI(
			<Grid exportable={[{ pdf: { onExport } }]} columns={columns} rows={rows} getKey={getKey} />,
		)

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to pdf' }))

		expect(onExport).toHaveBeenCalledTimes(1)
	})

	it('resolves every type key of a multi-type object entry, not just the first', () => {
		const csv = vi.fn()

		const pdf = vi.fn()

		renderUI(
			<Grid
				exportable={[{ csv: { onExport: csv }, pdf: { onExport: pdf } }]}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

		rightClickHeader('Name')

		// Both keys resolve to their own action; the second is no longer dropped.
		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(csv).toHaveBeenCalledTimes(1)

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to pdf' }))

		expect(pdf).toHaveBeenCalledTimes(1)
	})

	it('drops an entry naming an unknown type with no onExport', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderUI(<Grid exportable={['csv', 'pdf']} columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Export to pdf' })).toBeNull()

		expect(warn).toHaveBeenCalled()

		warn.mockRestore()
	})

	// A server-paginated grid holds only the page it was handed; `exportRows`
	// supplies the full list the engine can't reach on its own.
	const pageRow: Row[] = [{ id: 1, name: 'Alice', role: 'Developer' }]

	const fullList: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
		{ id: 3, name: 'Carol', role: 'Manager' },
	]

	it('exports a synchronous exportRows list, not just the loaded page', async () => {
		const createObjectURL = mockCsvDownload()

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				pagination={{ manual: true, rowCount: fullList.length }}
				exportRows={() => fullList}
			/>,
		)

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		const text = await blob.text()

		// Off-page rows the engine never held still make the export.
		expect(text).toContain('Alice,Developer')

		expect(text).toContain('Bob,Designer')

		expect(text).toContain('Carol,Manager')
	})

	it('awaits an async exportRows server function before downloading', async () => {
		const createObjectURL = mockCsvDownload()

		const fetchAll = vi.fn().mockResolvedValue(fullList)

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				pagination={{ manual: true, rowCount: fullList.length }}
				exportRows={fetchAll}
			/>,
		)

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(fetchAll).toHaveBeenCalledTimes(1)

		// The download waits for the fetch to resolve rather than firing on click.
		await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		expect(await blob.text()).toContain('Carol,Manager')
	})

	it('lets exportRows win over an active selection', async () => {
		const createObjectURL = mockCsvDownload()

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				selection={{ defaultValue: new Set([1]) }}
				exportRows={() => fullList}
			/>,
		)

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		const text = await blob.text()

		// Selecting Alice does not narrow the export — exportRows supplies them all.
		expect(text).toContain('Alice,Developer')

		expect(text).toContain('Bob,Designer')

		expect(text).toContain('Carol,Manager')
	})

	it('feeds the exportRows list into an onExport override', () => {
		const onExport = vi.fn()

		renderUI(
			<Grid
				exportable={[{ csv: { onExport } }]}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={() => fullList}
			/>,
		)

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(onExport).toHaveBeenCalledTimes(1)

		expect(onExport.mock.calls[0]?.[0].rows).toEqual(fullList)
	})

	it('swallows a rejected exportRows with a dev-only warning, downloading nothing', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={() => Promise.reject(new Error('server down'))}
			/>,
		)

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		await waitFor(() => expect(error).toHaveBeenCalled())

		expect(createObjectURL).not.toHaveBeenCalled()
	})

	it('swallows a synchronous exportRows throw with a dev-only warning, downloading nothing', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={() => {
					throw new Error('params not ready')
				}}
			/>,
		)

		openExportMenu()

		// A synchronous throw from exportRows fails safe like a rejected fetch —
		// the click handler must not throw, and nothing downloads.
		expect(() =>
			fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' })),
		).not.toThrow()

		expect(error).toHaveBeenCalled()

		expect(createObjectURL).not.toHaveBeenCalled()
	})

	it('spins the Export button and emits onExportPending across an async export', async () => {
		const createObjectURL = mockCsvDownload()

		const onExportPending = vi.fn()

		let release: (rows: Row[]) => void = () => {}

		const roundTrip = new Promise<Row[]>((resolve) => {
			release = resolve
		})

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				pagination={{ manual: true, rowCount: fullList.length }}
				exportRows={() => roundTrip}
				onExportPending={onExportPending}
			/>,
		)

		// Hold the node: while loading its accessible name gains the spinner's
		// "Loading" and no longer matches 'Export', but the DOM node itself persists.
		const exportButton = screen.getByRole('button', { name: 'Export' })

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		// Kicked off: button spins + disables, consumer told true, nothing downloaded yet.
		expect(onExportPending).toHaveBeenCalledWith(true)

		expect(exportButton).toBeDisabled()

		expect(exportButton).toHaveAttribute('aria-busy', 'true')

		expect(createObjectURL).not.toHaveBeenCalled()

		release(fullList)

		// Rows land: the download fires and the button falls back to idle.
		await waitFor(() => expect(onExportPending).toHaveBeenLastCalledWith(false))

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		expect(exportButton).not.toBeDisabled()

		// Exactly one busy→idle cycle — no spurious toggles.
		expect(onExportPending).toHaveBeenCalledTimes(2)
	})

	it('leaves onExportPending and the Export button untouched for a synchronous export', async () => {
		const createObjectURL = mockCsvDownload()

		const onExportPending = vi.fn()

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={() => fullList}
				onExportPending={onExportPending}
			/>,
		)

		const exportButton = screen.getByRole('button', { name: 'Export' })

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))

		// A synchronous list downloads inside the click — no pending cycle at all.
		expect(onExportPending).not.toHaveBeenCalled()

		expect(exportButton).not.toBeDisabled()
	})
})
