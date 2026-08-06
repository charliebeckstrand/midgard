import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, useGridExportActions } from '../../modules/grid'
import { downloadCsv, rowsToCsv } from '../../modules/grid/engine/grid-export/csv'
import type { GridExportRows } from '../../modules/grid/engine/grid-export/types'
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

	/** Opens the Export parent inside an open context menu (the toolbar's twin, one level in). */
	const openExportSubmenu = () => fireEvent.click(screen.getByRole('menuitem', { name: 'Export' }))

	it('omits every export item and the toolbar button when exportable is false', () => {
		renderUI(<Grid exportable={false} columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: 'Export' })).toBeNull()

		rightClickHeader('Name')

		expect(screen.queryByRole('menuitem', { name: 'Export to CSV' })).toBeNull()
	})

	it('enables CSV and Excel (not print) by default with no exportable prop', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		openExportSubmenu()

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to Excel' })).toBeInTheDocument()

		// Print stays opt-in — it opens the print dialog rather than downloading.
		expect(screen.queryByRole('menuitem', { name: 'Print' })).toBeNull()
	})

	it('keeps the toolbar dropdown out until the toolbar surface is opted in', () => {
		renderUI(<Grid exportable={['csv']} columns={columns} rows={rows} getKey={getKey} />)

		// The menus carry export by default; the toolbar button is the opt-in half.
		expect(screen.queryByRole('button', { name: 'Export' })).toBeNull()

		rightClickHeader('Name')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()
	})

	it('renders the toolbar dropdown alone when the context-menu surface is off', () => {
		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true, contextMenu: false }}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()

		rightClickHeader('Name')

		// The header menu still opens its own controls; only export is held back.
		expect(screen.getByRole('menuitem', { name: 'Sort' })).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Export to CSV' })).toBeNull()
	})

	it('hands a contextMenu builder no export actions once that surface is off', () => {
		const seen: number[] = []

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true, contextMenu: false }}
				columns={columns}
				rows={rows}
				getKey={getKey}
				contextMenu={{
					column: (context, defaults) => {
						seen.push(context.exportActions.length)

						return defaults
					},
				}}
			/>,
		)

		rightClickHeader('Name')

		// The builder sees exactly what its menu offers, so it can't re-place an
		// export the surface switch held back.
		expect(seen).not.toHaveLength(0)

		expect(seen.every((count) => count === 0)).toBe(true)
	})

	it('takes the CSV + Excel default when the config names no types', () => {
		renderUI(<Grid exportable={{ toolbar: true }} columns={columns} rows={rows} getKey={getKey} />)

		openExportMenu()

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to Excel' })).toBeInTheDocument()

		// Only the `true` shorthand adds print; a surface switch never does.
		expect(screen.queryByRole('menuitem', { name: 'Print' })).toBeNull()
	})

	it('enables the default CSV + Excel + print set for the boolean shorthand', () => {
		renderUI(<Grid exportable columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		openExportSubmenu()

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Export to Excel' })).toBeInTheDocument()

		expect(screen.getByRole('menuitem', { name: 'Print' })).toBeInTheDocument()
	})

	it('lists one item per action in the toolbar Export dropdown', () => {
		renderUI(
			<Grid
				exportable={{ types: ['csv', 'excel', 'print'], toolbar: true }}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

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

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

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
				columnManager={{ toolbar: true }}
				exportable={{ toolbar: true }}
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
				exportable={{ types: ['csv'], toolbar: true }}
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
				exportable={{ types: ['csv'], toolbar: true }}
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

		openExportSubmenu()

		// Both keys resolve to their own action; the second is no longer dropped.
		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(csv).toHaveBeenCalledTimes(1)

		rightClickHeader('Name')

		openExportSubmenu()

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
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
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

		click.mockRestore()
	})

	it('awaits an async exportRows server function before downloading', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		const fetchAll = vi.fn().mockResolvedValue(fullList)

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
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

		click.mockRestore()
	})

	it('swaps the download icon for a spinner while an async export is in flight', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		let release: (rows: Row[]) => void = () => {}

		const fetchAll = () =>
			new Promise<Row[]>((resolve) => {
				release = resolve
			})

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={fetchAll}
			/>,
		)

		const trigger = screen.getByRole('button', { name: 'Export' })

		// At rest the trigger carries the download icon and no spinner.
		expect(trigger.querySelector('svg.lucide-download')).not.toBeNull()

		expect(trigger.querySelector('[data-slot="loading-spinner"]')).toBeNull()

		openExportMenu()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		// While the fetch is pending the spinner replaces the icon — the two never
		// render side by side — and the trigger gates re-activation.
		await waitFor(() =>
			expect(trigger.querySelector('[data-slot="loading-spinner"]')).not.toBeNull(),
		)

		expect(trigger.querySelector('svg.lucide-download')).toBeNull()

		expect(trigger).toBeDisabled()

		release(fullList)

		// Settling restores the icon, drops the spinner, and re-enables the trigger.
		await waitFor(() => expect(trigger.querySelector('[data-slot="loading-spinner"]')).toBeNull())

		expect(trigger.querySelector('svg.lucide-download')).not.toBeNull()

		expect(trigger).toBeEnabled()

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		click.mockRestore()
	})

	it('lets exportRows win over an active selection', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
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

		click.mockRestore()
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

		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
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

		error.mockRestore()
	})

	// The "Exporting" overlay: the indicator for an async export, and the only one a
	// grid without the opt-in toolbar dropdown has.

	const overlay = () => document.querySelector('[data-slot="grid-export-overlay"]')

	it('covers the grid with an Exporting overlay while a menu-fired export is in flight', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		let release: (rows: Row[]) => void = () => {}

		renderUI(
			<Grid
				// Menus only — no toolbar trigger to spin, which is the case the overlay exists for.
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={() =>
					new Promise<Row[]>((resolve) => {
						release = resolve
					})
				}
			/>,
		)

		expect(overlay()).toBeNull()

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		await waitFor(() => expect(overlay()).not.toBeNull())

		// The spinner's own live region announces the wait; the visible text repeats it
		// for sighted users without doubling the announcement.
		expect(overlay()?.querySelector('[data-slot="loading-spinner"]')).not.toBeNull()

		expect(overlay()?.textContent).toContain('Exporting')

		release(fullList)

		await waitFor(() => expect(overlay()).toBeNull())

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		click.mockRestore()
	})

	it('lifts the overlay when an export fails, rather than covering the grid for good', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		let reject: (reason: Error) => void = () => {}

		renderUI(
			<Grid
				exportable={['csv']}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={() =>
					new Promise<Row[]>((_, fail) => {
						reject = fail
					})
				}
			/>,
		)

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		await waitFor(() => expect(overlay()).not.toBeNull())

		reject(new Error('server down'))

		await waitFor(() => expect(overlay()).toBeNull())

		error.mockRestore()
	})

	it('leaves a synchronous export uncovered — there is no wait to report', () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(<Grid exportable={['csv']} columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		expect(overlay()).toBeNull()

		click.mockRestore()
	})

	it('spins the toolbar trigger for an export fired from a right-click menu', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		let release: (rows: Row[]) => void = () => {}

		renderUI(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
				columns={columns}
				rows={pageRow}
				getKey={getKey}
				exportRows={() =>
					new Promise<Row[]>((resolve) => {
						release = resolve
					})
				}
			/>,
		)

		// Held before the run: while loading, the spinner's label joins the trigger's
		// accessible name, so the by-name query no longer finds it.
		const trigger = screen.getByRole('button', { name: 'Export' })

		rightClickHeader('Name')

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		// One pending count feeds both indicators, so the trigger reflects an export it
		// didn't start rather than sitting idle beside the overlay.
		await waitFor(() =>
			expect(trigger.querySelector('[data-slot="loading-spinner"]')).not.toBeNull(),
		)

		expect(overlay()).not.toBeNull()

		release(fullList)

		await waitFor(() => expect(overlay()).toBeNull())

		expect(trigger.querySelector('svg.lucide-download')).not.toBeNull()

		click.mockRestore()
	})
})

describe('Grid export under grouping', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'select', selectable: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
	]

	const people: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Designer' },
		{ id: 3, name: 'Carol', role: 'Developer' },
		{ id: 4, name: 'Dave', role: 'Designer' },
	]

	const getKey = (row: Row) => row.id

	/** Downloads a CSV through the toolbar and returns its text. */
	const exportCsv = async (ui: Parameters<typeof renderUI>[0]): Promise<string> => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL

		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(ui)

		fireEvent.click(screen.getByRole('button', { name: 'Export' }))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Export to CSV' }))

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		click.mockRestore()

		return blob.text()
	}

	it('exports every leaf, not one row per group', async () => {
		// Client grouping runs before sorting, so the sorted row model is the
		// group-header rows and each header's `original` is its first leaf's
		// datum. Walking that model exported "Alice" and "Bob" alone.
		const text = await exportCsv(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role' }}
			/>,
		)

		expect(text).toContain('Developer,Alice')

		expect(text).toContain('Designer,Bob')

		expect(text).toContain('Developer,Carol')

		expect(text).toContain('Designer,Dave')
	})

	it('exports the leaves of a collapsed group, whatever its expansion', async () => {
		const text = await exportCsv(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role', defaultExpanded: false }}
			/>,
		)

		expect(text).toContain('Developer,Carol')

		expect(text).toContain('Designer,Dave')
	})

	it('honors an active selection under grouping', async () => {
		// Group-header ids never appear in the mirrored selection state, so the
		// selection read as empty and silently fell back to the full set.
		const text = await exportCsv(
			<Grid
				exportable={{ types: ['csv'], toolbar: true }}
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				selection={{ defaultValue: new Set([3]) }}
			/>,
		)

		expect(text).toContain('Developer,Carol')

		expect(text).not.toContain('Developer,Alice')

		expect(text).not.toContain('Designer,Bob')

		expect(text).not.toContain('Designer,Dave')
	})
})

describe('useGridExportActions', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice' },
		{ id: 2, name: 'Bob' },
	]

	/**
	 * Renders the hook's result — the labels it resolved and its pending flag —
	 * and exposes the actions for a test to run. A probe component rather than
	 * `renderHook`, matching how the rest of this suite drives hooks.
	 */
	function Probe(props: {
		exportRows: GridExportRows<Row>
		onExport: (context: { rows: Row[] }) => void
	}) {
		const { actions, pending } = useGridExportActions<Row>({
			columns,
			exportRows: props.exportRows,
			exportable: [{ csv: { onExport: props.onExport } }],
		})

		return (
			<div>
				<span data-testid="pending">{String(pending)}</span>

				{actions.map((action) => (
					<button key={action.type} type="button" onClick={() => void action.run()}>
						{action.label}
					</button>
				))}
			</div>
		)
	}

	it('resolves one action per configured type, labelled as the grid labels its own', () => {
		const onExport = vi.fn()

		renderUI(<Probe exportRows={() => rows} onExport={onExport} />)

		fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))

		// The caller's rows reach the exporter through the same context the grid builds.
		expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ rows, columns }))
	})

	it('stays settled through a synchronous export — there is nothing to wait on', () => {
		renderUI(<Probe exportRows={() => rows} onExport={() => {}} />)

		fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))

		expect(screen.getByTestId('pending')).toHaveTextContent('false')
	})

	it('reports pending across an async round-trip, settling once it resolves', async () => {
		let release: ((value: Row[]) => void) | undefined

		const onExport = vi.fn()

		renderUI(
			<Probe
				exportRows={() =>
					new Promise<Row[]>((resolve) => {
						release = resolve
					})
				}
				onExport={onExport}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))

		await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('true'))

		release?.(rows)

		await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('false'))

		expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ rows }))
	})
})
