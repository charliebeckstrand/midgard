import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

// Counts the builds of each cursor order.
const builds = vi.hoisted(() => ({ grouped: 0, detail: 0 }))

vi.mock('../../modules/grid/grid-cursor-order', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/grid/grid-cursor-order')>()

	return {
		...actual,
		groupedCursorRows: ((...args: Parameters<typeof actual.groupedCursorRows>) => {
			builds.grouped++

			return actual.groupedCursorRows(...args)
		}) as typeof actual.groupedCursorRows,
		detailCursorRows: ((...args: Parameters<typeof actual.detailCursorRows>) => {
			builds.detail++

			return actual.detailCursorRows(...args)
		}) as typeof actual.detailCursorRows,
	}
})

type Row = { id: number; team: string; name: string }

const rows: Row[] = Array.from({ length: 6 }, (_, id) => ({
	id,
	team: id < 3 ? 'A' : 'B',
	name: `Name ${id}`,
}))

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'expand', expander: true },
	{ id: 'team', title: 'Team', field: 'team', groupable: true },
	{ id: 'name', title: 'Name', field: 'name' },
]

/**
 * An unwindowed grouped or master-detail body gives the cursor its order of
 * rows. A render of the grid that leaves the groups or the rows as they were
 * builds no new order.
 */
describe('Grid cursor order builds', () => {
	it('builds no grouped order again when the groups hold', () => {
		const view = (hover: boolean) => (
			<Grid
				navigable
				hover={hover}
				columns={columns}
				rows={rows}
				getKey={getKey}
				groupBy={{ value: 'team' }}
			/>
		)

		const { rerender } = renderUI(view(false))

		builds.grouped = 0

		rerender(view(true))

		expect(builds.grouped).toBe(0)
	})

	it('builds no detail order again when the rows and the expansion hold', () => {
		const expandable = { render: (row: Row) => <p>{row.name}</p> }

		const view = (hover: boolean) => (
			<Grid
				navigable
				hover={hover}
				columns={columns}
				rows={rows}
				getKey={getKey}
				expandable={expandable}
			/>
		)

		const { rerender } = renderUI(view(false))

		builds.detail = 0

		rerender(view(true))

		expect(builds.detail).toBe(0)
	})
})
