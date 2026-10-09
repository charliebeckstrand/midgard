import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import type { GridNavCell } from '../../modules/grid/grid-nav-cell'
import { fireEvent, gridCells, renderUI, screen } from '../helpers'

// Counts the renders of each data cell's cursor flag, by `row:col`. The flag
// holds `data-active` and `data-in-range`, so it renders when either changes.
const flagRenders = vi.hoisted(() => [] as string[])

vi.mock('../../modules/grid/grid-nav-cell', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/grid/grid-nav-cell')>()

	return {
		...actual,
		GridNavCell: ((props: Parameters<typeof actual.GridNavCell>[0]) => {
			if (props.stop === undefined) flagRenders.push(`${props.row}:${props.col}`)

			return actual.GridNavCell(props)
		}) as typeof GridNavCell,
	}
})

/**
 * Each cell reads its own place in the range from the cursor store. A change of
 * the range therefore renders only the cells whose flag flips, and no row or
 * cell content renders again.
 */
describe('Grid range renders', () => {
	type Row = { id: number; name: string; role: string; city: string }

	const rows: Row[] = Array.from({ length: 20 }, (_, id) => ({
		id,
		name: `Name ${id}`,
		role: `Role ${id}`,
		city: `City ${id}`,
	}))

	const contentRenders = { count: 0 }

	const columns: GridColumn<Row>[] = (['name', 'role', 'city'] as const).map((id) => ({
		id,
		title: id,
		cell: (row) => {
			contentRenders.count++

			return row[id]
		},
	}))

	/** The `row:col` of each data cell, with its `data-active` and `data-in-range` flags. */
	function flags(): Map<string, string> {
		return new Map(
			gridCells().map((node, index) => [
				`${Math.floor(index / columns.length)}:${index % columns.length}`,
				`${node.hasAttribute('data-active')}|${node.hasAttribute('data-in-range')}`,
			]),
		)
	}

	/** Runs `change`, and returns the cells whose flags flipped and the cells that rendered. */
	function measure(change: () => void): { flipped: string[]; rendered: string[] } {
		const before = flags()

		flagRenders.length = 0

		contentRenders.count = 0

		change()

		const after = flags()

		expect(contentRenders.count).toBe(0)

		return {
			flipped: [...after].filter(([key, value]) => before.get(key) !== value).map(([key]) => key),
			rendered: [...flagRenders],
		}
	}

	function renderRangeGrid() {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} navigable range />)

		const grid = screen.getByRole('grid')

		fireEvent.mouseDown(gridCells()[0] as HTMLElement)

		return grid
	}

	const shift = (grid: HTMLElement, key: string, extra?: object) =>
		fireEvent.keyDown(grid, { key, shiftKey: true, ...extra })

	it('renders only the cells that a Shift move adds to the range', () => {
		const grid = renderRangeGrid()

		for (const key of ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowDown']) {
			const { flipped, rendered } = measure(() => shift(grid, key))

			expect(flipped.length).toBeGreaterThan(0)

			expect(rendered.toSorted()).toEqual(flipped.toSorted())
		}
	})

	it('renders only the cells that a Shift move takes out of the range', () => {
		const grid = renderRangeGrid()

		shift(grid, 'ArrowDown')

		shift(grid, 'ArrowDown')

		shift(grid, 'ArrowRight')

		for (const key of ['ArrowUp', 'ArrowLeft']) {
			const { flipped, rendered } = measure(() => shift(grid, key))

			expect(flipped.length).toBeGreaterThan(0)

			expect(rendered.toSorted()).toEqual(flipped.toSorted())
		}
	})

	it('renders only the cells of the range that a jump to the corner adds', () => {
		const grid = renderRangeGrid()

		shift(grid, 'ArrowDown')

		const { flipped, rendered } = measure(() => shift(grid, 'End', { ctrlKey: true }))

		// Each cell outside the range joins it, and the cursor leaves the second
		// row. Only the anchor holds its flags.
		expect(flipped).toHaveLength(rows.length * columns.length - 1)

		expect(rendered.toSorted()).toEqual(flipped.toSorted())
	})

	it('renders only the cells of the range that a move without Shift clears', () => {
		const grid = renderRangeGrid()

		shift(grid, 'ArrowDown')

		shift(grid, 'ArrowRight')

		const { flipped, rendered } = measure(() => fireEvent.keyDown(grid, { key: 'ArrowDown' }))

		expect(flipped.length).toBeGreaterThan(0)

		expect(rendered.toSorted()).toEqual(flipped.toSorted())
	})
})
