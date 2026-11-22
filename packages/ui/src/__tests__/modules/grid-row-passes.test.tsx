import { Profiler } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import type { GridSortState } from '../../modules/grid/engine/grid-sort/state'
import { renderUI } from '../helpers'

/**
 * The passes over the loaded rows that each grid gesture makes. A gesture that
 * costs O(page) makes no pass. A new pass over every loaded row is the cost
 * that a large grid pays on each gesture, so this file names each pass.
 *
 * A case counts the calls of two callbacks of the public API. `getKey` keys a
 * row, and the sort decodes the `value` of the sort column. A case runs each
 * gesture at two counts of loaded rows. The difference of the calls,
 * divided by the difference of the counts, is the count of passes. The work of
 * the page or the window is the same at the two counts, so it cancels out.
 *
 * The counts are exact integers. They do not depend on the machine, the
 * clock, the garbage collector, or the version of V8, so each run gives the
 * same result. A pass that calls neither callback, such as a copy of the rows,
 * is out of sight here.
 *
 * Each gesture also commits one render. An extra render of the grid body
 * costs O(page), and this file finds it all the same.
 *
 * Under `virtualize`, jsdom lays nothing out, so the window holds no rows.
 * The windowed passes come from the arrays of every loaded row, and the
 * window adds no call.
 */

type Row = { id: string; origin: string; weight: number }

/** The two counts of loaded rows that each case compares. */
const SMALL = 100

const LARGE = 200

/** The rows of one page of a paged grid. */
const PAGE_SIZE = 10

/** The rows that one append of infinite scroll adds. */
const BATCH = 5

/** The origins of the rows, so that a sort on the origin has ties. */
const ORIGINS = 13

/** The rows `from` to `from + count`, with a fixed origin for each row. */
function makeRows(count: number, from = 0): Row[] {
	return Array.from({ length: count }, (_, offset) => {
		const index = from + offset

		return { id: `row-${index}`, origin: `City ${(index * 7) % ORIGINS}`, weight: index }
	})
}

const ASC: GridSortState[] = [{ column: 'origin', direction: 'asc' }]

const DESC: GridSortState[] = [{ column: 'origin', direction: 'desc' }]

/** How the grid shows its rows: client pages, or a virtualized window. */
type Layout = 'paged' | 'windowed'

/** The gestures that this file counts. */
type Gesture =
	| 'rerender'
	| 'firstFlip'
	| 'sortFlip'
	| 'sortedRefresh'
	| 'refresh'
	| 'append'
	| 'pageTurn'

/** The passes of a gesture over the loaded rows, for each callback. */
type Passes = { key: number; value: number }

/**
 * The passes of each gesture over the loaded rows. A missing entry is a
 * gesture that the layout does not have.
 *
 * - `rerender`: a render with the same props.
 * - `firstFlip`: the first asc/desc flip of a sort. The grid turns the cached
 *   order around, and decodes the key of each row to find the runs of equal
 *   keys. It does not sort.
 * - `sortFlip`: a flip to an order that the grid has cached. It decodes
 *   nothing.
 * - `sortedRefresh`: a new array of the same rows under a sort. The grid sorts
 *   the new rows from the start, and decodes the key of each row one time.
 * - `refresh`: a new array of the same rows, with no sort.
 * - `append`: one batch of rows at the end, with no sort.
 * - `pageTurn`: a move to the next page.
 *
 * A paged grid keys only the rows of its page. A windowed grid keys each
 * loaded row on each change of the order or of the rows. It reads its rows
 * from arrays of every loaded row (Grid roadmap, Performance item 1).
 */
const PASSES: Record<Layout, Partial<Record<Gesture, Passes>>> = {
	paged: {
		rerender: { key: 0, value: 0 },
		firstFlip: { key: 0, value: 1 },
		sortFlip: { key: 0, value: 0 },
		sortedRefresh: { key: 0, value: 1 },
		refresh: { key: 0, value: 0 },
		append: { key: 0, value: 0 },
		pageTurn: { key: 0, value: 0 },
	},
	windowed: {
		rerender: { key: 0, value: 0 },
		firstFlip: { key: 1, value: 1 },
		sortFlip: { key: 1, value: 0 },
		sortedRefresh: { key: 1, value: 1 },
		refresh: { key: 1, value: 0 },
		append: { key: 1, value: 0 },
	},
}

/** The calls and the commits of one gesture. */
type Count = { key: number; value: number; commits: number }

/** The state that a case renders. */
type View = { rows: readonly Row[]; sort: GridSortState[]; pageIndex: number }

/** Mounts a grid on `count` rows, counts each gesture of `layout`, and unmounts it. */
function countGestures(layout: Layout, count: number): Partial<Record<Gesture, Count>> {
	const calls: Count = { key: 0, value: 0, commits: 0 }

	const getKey = (row: Row) => {
		calls.key++

		return row.id
	}

	const columns: GridColumn<Row>[] = [
		{
			id: 'origin',
			title: 'Origin',
			sortable: true,
			value: (row) => {
				calls.value++

				return row.origin
			},
		},
		{ id: 'weight', title: 'Weight', sortable: true, value: (row) => row.weight },
	]

	const rows = makeRows(count)

	// An append keeps the loaded row objects and adds a batch after them, as an
	// app does. The batch is the same at each count.
	const appended = [...rows, ...makeRows(BATCH, count)]

	let view: View = { rows, sort: ASC, pageIndex: 0 }

	const element = () => (
		<Profiler id="grid" onRender={() => calls.commits++}>
			<Grid
				columns={columns}
				rows={view.rows}
				getKey={getKey}
				sort={{ value: view.sort }}
				{...(layout === 'paged'
					? { pagination: { value: { pageIndex: view.pageIndex, pageSize: PAGE_SIZE } } }
					: { virtualize: true, maxHeight: '600px' })}
			/>
		</Profiler>
	)

	const { rerender, unmount } = renderUI(element())

	const counts: Partial<Record<Gesture, Count>> = {}

	const measure = (gesture: Gesture, next: Partial<View>) => {
		calls.key = 0

		calls.value = 0

		calls.commits = 0

		view = { ...view, ...next }

		rerender(element())

		counts[gesture] = { ...calls }
	}

	const draw = (next: Partial<View>) => {
		view = { ...view, ...next }

		rerender(element())
	}

	// The first flip caches the descending order, and the flip back reads the
	// ascending order that the mount cached.
	measure('firstFlip', { sort: DESC })

	draw({ sort: ASC })

	measure('rerender', {})

	measure('sortFlip', { sort: DESC })

	draw({ sort: ASC })

	measure('sortedRefresh', { rows: rows.slice() })

	draw({ rows, sort: [] })

	measure('refresh', { rows: rows.slice() })

	draw({ rows })

	measure('append', { rows: appended.slice() })

	if (layout === 'paged') {
		draw({ rows })

		measure('pageTurn', { pageIndex: 1 })
	}

	unmount()

	return counts
}

describe.each(['paged', 'windowed'] as const)('Grid row passes · %s', (layout) => {
	let small: Partial<Record<Gesture, Count>> = {}

	let large: Partial<Record<Gesture, Count>> = {}

	beforeAll(() => {
		small = countGestures(layout, SMALL)

		large = countGestures(layout, LARGE)
	})

	const passes = (gesture: Gesture, callback: 'key' | 'value') =>
		((large[gesture]?.[callback] ?? 0) - (small[gesture]?.[callback] ?? 0)) / (LARGE - SMALL)

	it.each(Object.entries(PASSES[layout]) as [Gesture, Passes][])(
		'%s makes the named passes over the loaded rows',
		(gesture, expected) => {
			expect({ key: passes(gesture, 'key'), value: passes(gesture, 'value') }).toEqual(expected)
		},
	)

	it.each(Object.keys(PASSES[layout]) as Gesture[])('%s commits one render', (gesture) => {
		expect([small[gesture]?.commits, large[gesture]?.commits]).toEqual([1, 1])
	})
})
