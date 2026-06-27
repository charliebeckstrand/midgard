import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { downloadCsv, rowsToCsv } from '../../modules/grid/grid-export'
import { fireEvent, renderUI, screen, within } from '../helpers'

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
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')
		const revokeObjectURL = vi.fn()

		URL.createObjectURL = createObjectURL
		URL.revokeObjectURL = revokeObjectURL

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

		expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

		click.mockRestore()
	})
})

describe('Grid CSV export', () => {
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

	it('omits the export item unless exportable is set', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		rightClickHeader('Name')

		expect(screen.queryByRole('menuitem', { name: 'Export to CSV' })).toBeNull()
	})

	it('downloads the rows as CSV from the header menu when exportable', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL
		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(<Grid exportable columns={columns} rows={rows} getKey={getKey} />)

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

	it('omits the toolbar button for the boolean shorthand', () => {
		renderUI(<Grid exportable columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.queryByRole('button', { name: 'Export to CSV' })).toBeNull()
	})

	it('renders a toolbar button that downloads the CSV when toolbarButton is set', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock')

		URL.createObjectURL = createObjectURL
		URL.revokeObjectURL = vi.fn()

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		renderUI(
			<Grid exportable={{ toolbarButton: true }} columns={columns} rows={rows} getKey={getKey} />,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))

		expect(createObjectURL).toHaveBeenCalledTimes(1)

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob

		const text = await blob.text()

		expect(text).toContain('Name,Role')

		expect(text).toContain('Alice,Developer')

		expect(click).toHaveBeenCalledTimes(1)

		click.mockRestore()
	})

	it('keeps the header menu item alongside the toolbar button', () => {
		renderUI(
			<Grid exportable={{ toolbarButton: true }} columns={columns} rows={rows} getKey={getKey} />,
		)

		rightClickHeader('Name')

		expect(screen.getByRole('menuitem', { name: 'Export to CSV' })).toBeTruthy()
	})

	it('drops the menu item and toolbar button when enabled is false', () => {
		renderUI(
			<Grid
				exportable={{ enabled: false, toolbarButton: true }}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

		expect(screen.queryByRole('button', { name: 'Export to CSV' })).toBeNull()

		rightClickHeader('Name')

		expect(screen.queryByRole('menuitem', { name: 'Export to CSV' })).toBeNull()
	})

	it('labels the button and menu item with a custom label', () => {
		renderUI(
			<Grid
				exportable={{ toolbarButton: true, label: 'Download CSV' }}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Download CSV' })).toBeTruthy()

		rightClickHeader('Name')

		expect(screen.getByRole('menuitem', { name: 'Download CSV' })).toBeTruthy()
	})

	it('uses the configured filename for the download', () => {
		URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
		URL.revokeObjectURL = vi.fn()

		let downloadName: string | undefined

		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			downloadName = this.download
		})

		renderUI(
			<Grid
				exportable={{ toolbarButton: true, filename: 'people.csv' }}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Export to CSV' }))

		expect(downloadName).toBe('people.csv')

		click.mockRestore()
	})

	it('shares one tools toolbar with the column-manager button', () => {
		renderUI(
			<Grid
				columnManager={{ toolbarButton: true }}
				exportable={{ toolbarButton: true }}
				columns={columns}
				rows={rows}
				getKey={getKey}
			/>,
		)

		const tools = screen.getByRole('toolbar', { name: 'Table tools' })

		expect(within(tools).getByRole('button', { name: 'Manage columns' })).toBeInTheDocument()

		expect(within(tools).getByRole('button', { name: 'Export to CSV' })).toBeInTheDocument()
	})
})
