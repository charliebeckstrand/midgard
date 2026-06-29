import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent } from '../helpers'

/**
 * Grid status messages (WCAG 4.1.3): sort, selection, and page changes narrate
 * to the shared polite live region without moving focus. The region is created
 * lazily on first announce and reset between tests (see `setup/index.ts`), so an
 * empty region right after mount proves the change — not the initial value — spoke.
 */
describe('Grid announcements', () => {
	type Row = { name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
		{ id: 'age', title: 'Age', cell: (row) => row.age, sortable: true },
	]

	const rows: Row[] = [
		{ name: 'Alice', age: 30 },
		{ name: 'Bob', age: 25 },
	]

	const getKey = (row: Row) => row.name

	const politeRegion = () =>
		document.body.querySelector('[data-slot="live-region"][aria-live="polite"]')

	it('announces the sort politely on change, skipping mount', async () => {
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		// Lazily created on first announce; absent/empty means mount stayed silent.
		expect(politeRegion()?.textContent ?? '').toBe('')

		await user.click(screen.getByRole('button', { name: 'Sort by Name' }))

		await vi.waitFor(() => expect(politeRegion()).toHaveTextContent('Sorted by Name ascending'))
	})

	it('announces the selection count when a selectable grid changes', async () => {
		const user = userEvent.setup()

		const selectColumns: GridColumn<Row>[] = [{ id: 'select', selectable: true }, ...columns]

		renderUI(<Grid columns={selectColumns} rows={rows} getKey={getKey} />)

		await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }))

		await vi.waitFor(() => expect(politeRegion()).toHaveTextContent('All rows selected'))
	})

	it('scopes the select-all announcement to the page when paginated', async () => {
		const user = userEvent.setup()

		const selectColumns: GridColumn<Row>[] = [{ id: 'select', selectable: true }, ...columns]

		const many: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: `Name ${i + 1}`, age: i }))

		renderUI(
			<Grid
				columns={selectColumns}
				rows={many}
				getKey={(row) => row.name}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
			/>,
		)

		// Select-all is page-scoped under pagination, so the announcement says so
		// rather than overclaiming every row across all pages.
		await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }))

		await vi.waitFor(() =>
			expect(politeRegion()).toHaveTextContent('All rows on this page selected'),
		)
	})

	it('stays silent on selection changes when no column is selectable', async () => {
		const user = userEvent.setup()

		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} onRowClick={() => {}} />)

		await user.click(screen.getByText('Alice'))

		// No selection column, so a row interaction never narrates a selection count.
		expect(politeRegion()?.textContent ?? '').toBe('')
	})

	it('exposes the paginated range as a polite live region that tracks navigation', async () => {
		const user = userEvent.setup()

		const many: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: `Name ${i + 1}`, age: i }))

		renderUI(
			<Grid
				columns={columns}
				rows={many}
				getKey={(row) => row.name}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
			/>,
		)

		// The on-screen status itself is the live region (role="status"), so the new
		// range is announced on navigation without duplicating the text off-screen.
		const status = screen.getByText(/1.5 of 12/)

		expect(status).toHaveAttribute('role', 'status')

		await user.click(screen.getByRole('button', { name: 'Next page' }))

		await vi.waitFor(() => expect(status).toHaveTextContent(/6.10 of 12/))
	})
})
