/**
 * The memory churn of each grid gesture as the loaded rows grow. A pause of
 * the garbage collector follows the bytes that a gesture allocates, so this
 * file asserts the bytes and not the time (Grid roadmap, avenue 6).
 *
 * Each case mounts a grid at two sizes, runs the same gesture on each, and
 * divides the difference of the allocated bytes by the difference of the row
 * counts. The result is the cost of the gesture in bytes for each loaded row.
 * The work of the page or the window is the same at the two sizes, so it
 * cancels out. A gesture that costs O(page) has a slope near zero. One array
 * of the loaded rows costs 8 bytes for each row.
 *
 * Each budget is the slope that the gesture has now, as {@link BUDGETS}
 * records it. A slope must stay within {@link NOISE} of its budget. A change
 * that adds churn for each loaded row therefore fails here. A change that
 * removes churn also fails until it lowers the budget in the same commit, so
 * the budgets stay a true record.
 *
 * The file runs tests, not benches, so `pnpm bench:smoke` asserts the budgets
 * on each pull request. `--expose-gc` in `vitest.bench.config.ts` gives `gc`.
 */

import { GCProfiler, getHeapStatistics } from 'node:v8'
import { act } from '@testing-library/react'
import { createRoot } from 'react-dom/client'
import { expect, test } from 'vitest'
import { Grid } from '../modules/grid'
import type { GridSortState } from '../modules/grid/engine/grid-sort/state'
import { type Shipment, shipmentColumns, shipmentKey, shipments } from './fixtures'
import { modelLayout } from './harness'

/** The two counts of loaded rows that each case compares. */
const SMALL = 10_000

const LARGE = 100_000

/** The rows of one page of a paged grid. */
const PAGE_SIZE = 10

/** The rows that one append of infinite scroll adds. */
const BATCH = 50

/** The runs of each gesture at each size. The median is the measure. */
const RUNS = 5

/**
 * The noise of a slope, in bytes for each loaded row. It is less than one
 * array of the loaded rows, so a new array of the rows fails a budget.
 */
const NOISE = 1.5

/** The modeled viewport of the windowed grid, in pixels. */
const VIEWPORT = 600

/** The modeled height of each window row, in pixels. */
const ROW = 44

// jsdom lays nothing out, and a window over a zero-height viewport holds no
// rows. The model gives the scroller a viewport and each row a height, so the
// windowed grid renders a window of rows, as it does in a browser.
modelLayout({
	isScroller: (element) => element.dataset.slot === 'grid-scroll',
	viewport: VIEWPORT,
	width: 1000,
	rowHeight: (element) =>
		element.tagName === 'TR' && element.hasAttribute('data-index') ? ROW : 0,
})

const COLUMNS = shipmentColumns(() => ({ sortable: true }))

const ASC: GridSortState[] = [{ column: 'origin', direction: 'asc' }]

const DESC: GridSortState[] = [{ column: 'origin', direction: 'desc' }]

/** How the grid shows its rows: client pages, or a virtualized window. */
type Layout = 'paged' | 'windowed'

/** The gestures that this file measures. */
type Gesture = 'rerender' | 'sortFlip' | 'refresh' | 'sortedRefresh' | 'pageTurn' | 'append'

/**
 * The slope of each gesture, in bytes for each loaded row. A missing entry is
 * a gesture that the layout does not have.
 *
 * - `rerender`: a render with the same props.
 * - `sortFlip`: an asc/desc flip of a sort that the grid has cached.
 * - `refresh`: a new array of the same rows, with no sort.
 * - `sortedRefresh`: a new array of the same rows under a sort. The grid sorts
 *   the new rows from the start (roadmap, avenue 3).
 * - `pageTurn`: a move to the next page.
 * - `append`: one batch of rows at the end, with no sort.
 *
 * The windowed grid reads its rows from arrays of every loaded row. A sort
 * flip copies the rows and the keys in view order, which is two arrays. A
 * refresh builds the keys again, which is one array. An append builds the keys
 * again, and the virtualizer copies its measurements. In each layout, the sort
 * of new rows decodes a sort key for each row.
 */
const BUDGETS: Record<Layout, Partial<Record<Gesture, number>>> = {
	paged: { rerender: 0, sortFlip: 0, refresh: 0, sortedRefresh: 154, pageTurn: 0, append: 0 },
	windowed: { rerender: 0, sortFlip: 16, refresh: 8, sortedRefresh: 170, append: 16 },
}

/** The state that a case renders. */
type View = { rows: readonly Shipment[]; sort: GridSortState[]; pageIndex: number }

/**
 * The bytes that `run` allocates on the heap. A full collection runs first,
 * so a collection inside `run` frees only what `run` allocated. The bytes that
 * each such collection frees count as allocated.
 */
function allocatedBytes(run: () => void): number {
	if (typeof gc !== 'function') throw new Error('The bench worker has no `gc`.')

	gc()

	const profiler = new GCProfiler()

	profiler.start()

	const before = getHeapStatistics().used_heap_size

	run()

	const after = getHeapStatistics().used_heap_size

	let freed = 0

	for (const { beforeGC, afterGC } of profiler.stop()?.statistics ?? []) {
		freed += beforeGC.heapStatistics.usedHeapSize - afterGC.heapStatistics.usedHeapSize
	}

	return after - before + freed
}

/**
 * The median bytes of one gesture over {@link RUNS} runs. `prepare` runs
 * outside the measure, and gives the gesture to measure.
 */
function medianBytes(prepare: () => () => void): number {
	const samples = Array.from({ length: RUNS }, () => allocatedBytes(prepare()))

	samples.sort((a, b) => a - b)

	return samples[Math.floor(RUNS / 2)] as number
}

/** Mounts a grid on `count` rows, measures each gesture of `layout`, and unmounts it. */
function measureGestures(layout: Layout, count: number): Partial<Record<Gesture, number>> {
	const rows = shipments(count)

	// An append keeps the loaded row objects and adds a batch after them, as an
	// app does. The batch is the same at each size.
	const appended = [...rows, ...shipments(count + BATCH).slice(count)]

	const container = document.createElement('div')

	document.body.append(container)

	const root = createRoot(container)

	let view: View = { rows, sort: ASC, pageIndex: 0 }

	const draw = (next: Partial<View> = {}) => {
		view = { ...view, ...next }

		const shown =
			layout === 'paged'
				? { pagination: { value: { pageIndex: view.pageIndex, pageSize: PAGE_SIZE } } }
				: { virtualize: true, maxHeight: `${VIEWPORT}px` }

		act(() => {
			root.render(
				<Grid
					columns={COLUMNS}
					rows={view.rows}
					getKey={shipmentKey}
					sort={{ value: view.sort }}
					{...shown}
				/>,
			)
		})
	}

	// The mount, the first flip, and the flip back cache both orders, so each
	// measured flip reads a cached order.
	draw()

	draw({ sort: DESC })

	draw({ sort: ASC })

	const bytes: Partial<Record<Gesture, number>> = {}

	bytes.rerender = medianBytes(() => () => draw())

	bytes.sortFlip = medianBytes(() => {
		const sort = view.sort === ASC ? DESC : ASC

		return () => draw({ sort })
	})

	bytes.sortedRefresh = medianBytes(() => {
		const next = rows.slice()

		return () => draw({ rows: next })
	})

	draw({ rows, sort: [] })

	bytes.refresh = medianBytes(() => {
		const next = rows.slice()

		return () => draw({ rows: next })
	})

	bytes.append = medianBytes(() => {
		draw({ rows })

		const next = appended.slice()

		return () => draw({ rows: next })
	})

	if (layout === 'paged') {
		bytes.pageTurn = medianBytes(() => {
			const pageIndex = view.pageIndex === 0 ? 1 : 0

			return () => draw({ pageIndex })
		})
	}

	act(() => {
		root.unmount()
	})

	container.remove()

	return bytes
}

for (const layout of ['paged', 'windowed'] as const) {
	test(`grid churn · ${layout} · bytes for each loaded row`, { timeout: 0 }, () => {
		// A first pass compiles the code of each gesture, so that the compiler
		// allocates nothing in the measured passes.
		measureGestures(layout, SMALL)

		const small = measureGestures(layout, SMALL)

		const large = measureGestures(layout, LARGE)

		const budgets = Object.entries(BUDGETS[layout]) as [Gesture, number][]

		for (const [gesture, budget] of budgets) {
			const slope = ((large[gesture] ?? 0) - (small[gesture] ?? 0)) / (LARGE - SMALL)

			expect(
				Math.abs(slope - budget),
				`${layout} ${gesture}: ${slope.toFixed(1)} bytes for each loaded row, budget ${budget}`,
			).toBeLessThanOrEqual(NOISE)
		}
	})
}
