import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

/**
 * A `maxHeight="fill"` grid must still show its loading skeleton. The cap sizes
 * the grid to its content, and while loading that content is the placeholder run
 * — so this pins that the run has real height rather than collapsing the grid to
 * nothing before the rows arrive. Only real layout can tell: jsdom computes no
 * heights.
 */
describe('grid maxHeight="fill" while loading (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: () => 'Dev', value: () => 'Dev' },
	]

	const getKey = (row: Row) => row.id

	function render(loading: boolean) {
		return renderUI(
			<div style={{ width: '320px', height: '400px' }}>
				<Grid
					columns={columns}
					rows={[]}
					getKey={getKey}
					virtualize={{ estimateSize: 36 }}
					maxHeight="fill"
					footer={{ rowTotal: true }}
					loading={loading}
				/>
			</div>,
		)
	}

	it('draws the header and a skeleton run with real height while loading', () => {
		const { container } = render(true)

		const grid = container.querySelector('[data-slot="grid"]') as HTMLElement

		// The regression to catch: a content-capped grid that collapses to nothing
		// because the skeleton contributed no height.
		expect(grid.getBoundingClientRect().height).toBeGreaterThan(40)

		// The column headers stay up through the wait, so the shape of the table is
		// legible before its rows land.
		expect(container.querySelectorAll('th').length).toBeGreaterThan(0)
	})

	it('actually paints the skeleton rather than holding it behind the width gate', () => {
		const { container } = render(true)

		const table = container.querySelector('[data-slot="table"]') as HTMLElement

		// The width gate hides the table with `invisible` while it measures columns —
		// it keeps layout, so a height or `th` assertion passes straight through it.
		// Visibility is the only thing that distinguishes "drawn" from "occupying
		// space but blank", which is what the page actually looked like: a footer over
		// a sliver of nothing.
		expect(getComputedStyle(table).visibility).toBe('visible')
	})

	it('reveals the skeleton even when the width pass has no real cells to measure', () => {
		// The gate settles only on a pass that read real body cells, so a grid still
		// fetching can never satisfy it — `loading` is what reveals this one. Pinned
		// with the autosizer explicitly enabled (`resizable`, uncontrolled sizing),
		// since a grid it does not size is revealed from the first frame anyway and
		// would pass without exercising the clause.
		const { container } = renderUI(
			<div style={{ width: '320px', height: '400px' }}>
				<Grid
					columns={columns}
					rows={[]}
					getKey={getKey}
					resizable
					virtualize={{ estimateSize: 36 }}
					maxHeight="fill"
					loading
				/>
			</div>,
		)

		const table = container.querySelector('[data-slot="table"]') as HTMLElement

		expect(getComputedStyle(table).visibility).toBe('visible')
	})
})
