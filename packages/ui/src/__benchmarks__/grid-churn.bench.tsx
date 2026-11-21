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
 * Three parts of the method make each slope the same on each run:
 *
 * - The `churn` project of `vitest.bench.config.ts` runs this file without
 *   the optimizing tiers of V8. Those tiers remove some allocations after a
 *   function becomes hot, and the time of that compile changes from run to
 *   run. Without them, a gesture allocates the bytes that its code asks for.
 * - The measure reads only the heap spaces that hold data. V8 still compiles
 *   a function to baseline code while the process runs, and the code spaces
 *   hold that code. A compile in one pass is not a cost of the gesture.
 * - Each sample is the mean of two runs of the gesture in sequence. A render
 *   that gives the grid new row keys runs the `reconcile` effect of the
 *   cursor, which calls `setActive`. React drops that update before a render
 *   only when no copy of the fiber has pending work. Here that is true on
 *   every other call. On the other calls, React renders `GridDataReadOnly`
 *   again, and that render costs about 190 KB. Thus the bytes of the gesture
 *   go high and low in turn. A median of single runs took the side of the
 *   first run. A change of side between two passes moved a slope by 2 bytes
 *   for each row.
 * - The mean holds one run of each side only when one cycle of `prepare` and
 *   the gesture calls `setActive` once. The `prepare` of `append` renders the
 *   loaded rows again, so each run of `append` falls on the same side. The
 *   mean does not keep the `append` slopes from a change of side.
 *
 * Each budget is the slope that the gesture has now, as {@link BUDGETS}
 * records it. A slope must stay within {@link NOISE} of its budget. A change
 * that adds churn for each loaded row therefore fails here. A change that
 * removes churn also fails until it lowers the budget in the same commit, so
 * the budgets stay a true record.
 *
 * The budgets hold for the Node version of `.node-version`, which CI uses. A
 * new V8 can change the bytes of the same code, so a change of that version
 * can need new budgets.
 *
 * The file runs tests, not benches, so `pnpm bench:smoke` asserts the budgets
 * on each pull request. `--expose-gc` in `vitest.bench.config.ts` gives `gc`.
 */

import { GCProfiler, getHeapSpaceStatistics } from 'node:v8'
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

/** The samples of each gesture at each size. The median is the measure. */
const SAMPLES = 3

/**
 * The tolerance of a slope, in bytes for each loaded row. A slope repeats to
 * within 0.05 from run to run. One array of the loaded rows costs 8, so a
 * new array of the rows fails a budget.
 */
const NOISE = 0.5

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
 *   the new rows from the start, and decodes a sort key for each row.
 * - `pageTurn`: a move to the next page.
 * - `append`: one batch of rows at the end, with no sort.
 *
 * The windowed grid reads its rows from arrays of every loaded row. A sort
 * flip copies the rows and the keys in view order, which is two arrays. A
 * refresh builds the keys again, which is one array. An append builds the keys
 * again, and the virtualizer copies its measurements. Each windowed gesture
 * that changes the rows also walks every loaded row with `for...of` loops,
 * such as the loop of `hashKeys`. Until V8 optimizes a loop, each step
 * allocates an iterator result of 40 bytes. In each layout, the sort of new
 * rows decodes a sort key for each row.
 */
const BUDGETS: Record<Layout, Partial<Record<Gesture, number>>> = {
	paged: { rerender: 0, sortFlip: 0, refresh: 0, sortedRefresh: 127.4, pageTurn: 0, append: 0 },
	windowed: { rerender: 0, sortFlip: 93.1, refresh: 86, sortedRefresh: 221.3, append: 94 },
}

/** The state that a case renders. */
type View = { rows: readonly Shipment[]; sort: GridSortState[]; pageIndex: number }

/**
 * Whether a heap space holds compiled code: `code_space` and
 * `code_large_object_space`.
 */
const isCodeSpace = (name: string) => name.includes('code')

/** The sum of the used bytes of the spaces that hold data, from `[name, used]` pairs. */
function sumDataBytes(spaces: readonly (readonly [name: string, used: number])[]): number {
	return spaces.reduce((sum, [name, used]) => (isCodeSpace(name) ? sum : sum + used), 0)
}

/** The used bytes of the heap spaces that hold data, at one side of a collection that `GCProfiler` saw. */
function profiledDataBytes(side: {
	heapSpaceStatistics: readonly { spaceName: string; spaceUsedSize: number }[]
}): number {
	return sumDataBytes(
		side.heapSpaceStatistics.map((space) => [space.spaceName, space.spaceUsedSize]),
	)
}

/** The used bytes of the heap spaces that hold data, now. */
function dataBytes(): number {
	return sumDataBytes(
		getHeapSpaceStatistics().map((space) => [space.space_name, space.space_used_size]),
	)
}

/**
 * The bytes that `run` allocates in the heap spaces that hold data. A full
 * collection runs first, so a collection inside `run` frees only what `run`
 * allocated. The bytes that each such collection frees count as allocated.
 */
function allocatedBytes(run: () => void): number {
	if (typeof gc !== 'function') throw new Error('The bench worker has no `gc`.')

	gc()

	const profiler = new GCProfiler()

	profiler.start()

	const before = dataBytes()

	run()

	const after = dataBytes()

	let freed = 0

	for (const { beforeGC, afterGC } of profiler.stop()?.statistics ?? []) {
		freed += profiledDataBytes(beforeGC) - profiledDataBytes(afterGC)
	}

	return after - before + freed
}

/**
 * The median bytes of one gesture over {@link SAMPLES} samples. A sample is
 * the mean of two runs in sequence. When the runs of a gesture go high and low
 * in turn, a sample holds one run of each side. `append` is the exception, as
 * the file header says. `prepare` runs outside the measure, and gives the
 * gesture to measure.
 */
function medianBytes(prepare: () => () => void): number {
	const samples = Array.from(
		{ length: SAMPLES },
		() => (allocatedBytes(prepare()) + allocatedBytes(prepare())) / 2,
	)

	samples.sort((a, b) => a - b)

	return samples[Math.floor(SAMPLES / 2)] as number
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
		// A first pass compiles the code of each gesture and fills the caches.
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
