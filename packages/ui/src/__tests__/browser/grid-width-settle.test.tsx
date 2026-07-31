import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

/**
 * The column jump, in the environment that produces it.
 *
 * A reload paints the server's HTML, which has measured nothing; the fit at hydration
 * then corrects it. With a cold query cache — which a reload always has — that first fit
 * sees a header and no rows, so it is *provisional* by the same test `freezeOnRowChange`
 * uses, and the real widths only arrive once the rows do. Revealing on the provisional
 * pass is what still let the columns move.
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

	it('holds the table hidden until a fit has measured real rows', async () => {
		const view = renderUI(<Grid columns={columns} rows={[]} getKey={getKey} loading />)

		// Header-only: nothing has been measured, and the consumer says more is coming.
		expect(hidden()).toBe(true)

		view.rerender(<Grid columns={columns} rows={rows} getKey={getKey} />)

		await waitFor(() => expect(hidden()).toBe(false))
	})

	it('reveals an empty result rather than hanging hidden', async () => {
		const view = renderUI(<Grid columns={columns} rows={[]} getKey={getKey} loading />)

		expect(hidden()).toBe(true)

		// No rows will ever arrive, so there is nothing left to wait for.
		view.rerender(<Grid columns={columns} rows={[]} getKey={getKey} />)

		await waitFor(() => expect(hidden()).toBe(false))
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
