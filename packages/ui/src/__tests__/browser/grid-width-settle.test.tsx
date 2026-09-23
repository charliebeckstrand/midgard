import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

/**
 * The width gate, in the environment that produces the column jump.
 *
 * The gate holds the table's paint until a width pass reads real body cells. A body
 * with no data cells to read — the loading skeleton, the error slot, an empty result —
 * opens it at once, because that body is the state to show.
 *
 * Needs a real `ResizeObserver` and real layout, so it lives here: under jsdom the grid
 * takes the "nothing will ever fit these columns" bail and settles immediately.
 */
describe('grid width settling (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (r) => r.name, value: (r) => r.name, minWidth: 90 },
		{ id: 'role', title: 'Role', cell: (r) => r.role, value: (r) => r.role, minWidth: 90 },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'A considerably longer role title' },
	]

	const getKey = (row: Row) => row.id

	/** The gate is a class on the table itself — see `GridData`'s width-settling comment. */
	const hidden = () => document.querySelector('table')?.className.includes('invisible') ?? null

	it('shows the loading skeleton before any rows have been measured', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} loading />)

		// The skeleton is the state to show while the fetch runs; a hidden one shows nothing.
		expect(hidden()).toBe(false)
	})

	it('shows the error slot, which leaves no body cells to measure', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} error="Couldn't load" />)

		// The error replaces the rows, so no width pass ever reads a body cell.
		expect(hidden()).toBe(false)
	})

	it('reveals an empty result rather than hanging hidden', () => {
		renderUI(<Grid columns={columns} rows={[]} getKey={getKey} />)

		expect(hidden()).toBe(false)
	})

	it('stays revealed when a later fetch starts', async () => {
		const view = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await waitFor(() => expect(hidden()).toBe(false))

		// Page two, a filter, a re-sort: blanking a table being read would be worse than
		// the jump this exists to prevent.
		view.rerender(<Grid columns={columns} rows={[]} getKey={getKey} loading />)

		expect(hidden()).toBe(false)
	})
})
