import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

/**
 * The width gate, in the environment that produces the column jump.
 *
 * The gate holds the table's paint until a width pass reads real body cells. A body
 * with no data cells to read (the loading skeleton, the error slot, an empty result)
 * opens it at once, because that body is the state to show.
 *
 * Needs a real `ResizeObserver` and real layout, so it lives here: under jsdom the grid
 * takes the "nothing will ever fit these columns" bail and settles immediately.
 */
describe('grid width settling (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name, minWidth: 90 },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role, minWidth: 90 },
	]

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'A considerably longer role title' },
	]

	const getKey = (row: Row) => row.id

	/** The gate is a class on the table itself: see `GridData`'s width-settling comment. */
	const hidden = () => document.querySelector('table')?.className.includes('opacity-0') ?? null

	// Each body has no data cells for a width pass to read, so the gate opens at once.
	it.for([
		// The skeleton is the state to show while the fetch runs; a hidden one shows nothing.
		['shows the loading skeleton before any rows have been measured', { rows: [], loading: true }],
		// The error replaces the rows, so no width pass ever reads a body cell.
		[
			'shows the error slot, which leaves no body cells to measure',
			{ rows, error: "Couldn't load" },
		],
		['reveals an empty result rather than hanging hidden', { rows: [] }],
	] as const)('%s', ([, props]) => {
		renderUI(<Grid columns={columns} getKey={getKey} {...props} />)

		expect(hidden()).toBe(false)
	})

	it('drops the skeleton and the reserved height of a window once the columns fit', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} virtualize maxHeight="320px" />)

		await waitFor(() => expect(hidden()).toBe(false))

		expect(document.querySelector('[data-slot="grid-gate-skeleton"]')).toBeNull()

		// Two rows fill less than the cap, so the region takes the height of its rows.
		const region = document.querySelector<HTMLElement>('[data-slot="grid-scroll"]')

		expect(region?.style.height).toBe('')
		expect(region?.getBoundingClientRect().height).toBeLessThan(320)
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
