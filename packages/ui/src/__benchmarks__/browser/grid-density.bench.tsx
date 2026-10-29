/**
 * The restyle cost of the density classes on a grid of 1,000 rows with no
 * window, under 0, 1, and 2 density scopes. The status cell of each row renders
 * a `Badge`. Under 0 and 1 scope, the badge is a control slot
 * (`data-density="slot"`), because the grid has no slot of its own. Under 2
 * scopes, the badge is not a slot, so each row keeps the shape of the first
 * records in the README, where a slot 3 deep took the wrong step. The columns
 * have fixed widths, so no autosizer fit is in a sample. The stylesheet of
 * the suite (`setup.ts`) imports `ui/tailwind.css`, so the density rules that
 * the apps ship apply.
 *
 * Three scenarios run for each count of scopes:
 *
 * - A mount, then a teardown.
 * - An asc/desc flip of the `id` sort.
 * - A switch of the root density between `sm` and `lg` (the `compact` and
 *   `loose` levels) through `writeRootDensity`.
 *
 * Each sample settles on the paint probe, and then forces the style and the
 * layout of the grid with a read of its height. It does not wait for a
 * rendered frame, because a frame in the headless container reads the frame
 * and not the work (README). The root switch also waits one task. In that
 * task the root observer of `useDensityRoot` renders the grid again, and the
 * sample then forces the style and the layout again. A sample of the switch is
 * thus the work that a user pays for a change of level.
 *
 * A fourth scenario measures the matched-properties cache. In two grids of
 * 1,000 rows, each cell holds a span that is its own density scope, with a
 * stepped class that has equal stops at `md` and `lg` ({@link CACHE_CLASS}). In
 * one grid the span of each row is `md`, and in the other the rows alternate
 * `md` and `lg`. The scope is on the span and not on the row, because the
 * padding of a grid cell is stepped too. So the two grids have the same
 * geometry, and the spans read different weights. Only the sharing of the cache
 * is different. A sample hides the grid, and then shows it and forces the
 * style and the layout. Chromium computes the style of each element of the
 * shown subtree again, so the show matches each rule again.
 *
 * A Vitest bench times the wall clock only. Before the benches register, the
 * file therefore logs the `RecalcStyleDuration` and the `LayoutDuration` of
 * each scenario from the Chromium `Performance` domain, through `cdp()`. Each
 * figure is the mean of {@link TRACED} runs, in ms.
 *
 * The findings are in the README (Grids, Density restyle).
 */

import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { cdp } from 'vitest/browser'
import { Badge } from '../../components/badge'
import { type DensityStep, writeRootDensity } from '../../core/density'
import { Grid, type GridColumn, type GridSortState } from '../../modules/grid'
import { Density } from '../../primitives/density'
import { compareBenches } from '../compare'
import { SHIPMENT_FIELDS, type Shipment, shipmentKey, shipments } from '../fixtures'
import { GRID_HEIGHT, GRID_WIDTH, painted } from './grids'
import { benches, host, type Prepared, WINDOW } from './harness'

/** The columns of the grid. With `slot`, the badge of the status cell is a control slot. */
function columns(slot: boolean): GridColumn<Shipment>[] {
	return SHIPMENT_FIELDS.map(([id, title]) => ({
		id,
		title,
		sortable: true,
		width: '120px',
		value: (row) => row[id],
		cell:
			id === 'status'
				? (row) => <Badge data-density={slot ? 'slot' : undefined}>{row.status}</Badge>
				: (row) => String(row[id]),
	}))
}

/** The scopes around a grid, outer first, and whether its badge is a slot. */
type Shape = { steps: DensityStep[]; slot: boolean }

/**
 * The shape of each row. The nearest scope is `md`, the step of the bare root,
 * so each grid has one geometry in a mount and in a sort. The outer scope of
 * two is `lg`, so the nearest scope decides the step. The root switch writes
 * `sm` and `lg`, so a scope holds the grid at `md` through the switch.
 *
 * The slot is in the rows of 0 and 1 scope only, as in the first records of
 * the README. The badge of the 2-scope row takes the `md` step of its scope,
 * and the slots of the other rows take `sm`.
 */
const SHAPES: Record<string, Shape> = {
	'0 scopes · slot': { steps: [], slot: true },
	'1 scope · slot': { steps: ['md'], slot: true },
	'2 scopes · no slot': { steps: ['lg', 'md'], slot: false },
}

/**
 * The stepped classes of each cell of the cache scenario. The stops at `md`
 * and `lg` are equal, so a cell has the same box under the two scopes.
 */
const CACHE_CLASS = 'density-px-[2,2.5,3,3,4] density-py-[0.5,0.5,1,1,1.5]'

/** The scope of each row in the cache scenario, by the index of the row in the fixture. */
const CACHE_SCOPES: Record<string, (index: number) => DensityStep> = {
	'one value · md': () => 'md',
	'alternate · md/lg': (index) => (index % 2 === 0 ? 'md' : 'lg'),
}

/**
 * The columns of the cache scenario. Each cell holds one {@link CACHE_CLASS}
 * span, with the scope that `getScope` gives its row. The id of a row holds its
 * index in the fixture.
 */
function cacheColumns(getScope: (index: number) => DensityStep): GridColumn<Shipment>[] {
	return SHIPMENT_FIELDS.map(([id, title]) => ({
		id,
		title,
		width: '120px',
		value: (row) => row[id],
		cell: (row) => (
			<span data-density={getScope(Number(row.id.slice(1)))} className={CACHE_CLASS}>
				{String(row[id])}
			</span>
		),
	}))
}

/** The runs that each `Performance` figure averages. */
const TRACED = 10

/** Resolves after one task, which runs after each task that React scheduled before the call. */
function task() {
	return new Promise<void>((resolve) => {
		const channel = new MessageChannel()

		channel.port1.onmessage = () => resolve()

		channel.port2.postMessage(null)
	})
}

/** Forces the style and the layout of `box` and its subtree. */
function restyle(box: HTMLElement) {
	return box.offsetHeight
}

/** Shows `box`, and hides each other host in `boxes`, so a sample restyles one grid. */
function show(box: HTMLElement, boxes: HTMLElement[]) {
	for (const other of boxes) other.hidden = other !== box
}

/**
 * Wraps `children` in `steps`, outer first. Each scope writes both channels, as
 * the `density` prop of `PolymorphicStatic` does: `data-density` for the
 * classes, and the context for the JS readers of the grid.
 */
function Scopes({ steps, children }: { steps: DensityStep[]; children: ReactNode }) {
	const [step, ...inner] = steps

	if (!step) return children

	return (
		<div data-density={step}>
			<Density step={step}>
				<Scopes steps={inner}>{children}</Scopes>
			</Density>
		</div>
	)
}

/** Mounts one grid into `box` in `shape`, and returns a sort and a teardown. */
function mountGrid(box: HTMLElement, rows: Shipment[], { steps, slot }: Shape) {
	const root = createRoot(box)

	const cells = columns(slot)

	let sort: GridSortState[] = []

	const draw = () =>
		flushSync(() =>
			root.render(
				<Scopes steps={steps}>
					<Grid columns={cells} rows={rows} getKey={shipmentKey} sort={{ value: sort }} />
				</Scopes>,
			),
		)

	draw()

	return {
		sort(direction: 'asc' | 'desc') {
			sort = [{ column: 'id', direction }]

			draw()
		},
		destroy: () => root.unmount(),
	}
}

/** One grid under bench control: its scope count, its host, and its sort. */
type Mounted = { name: string; box: HTMLElement; grid: ReturnType<typeof mountGrid> }

/** The first and the last row. The last row proves that the grid drew each row, with no window. */
function ends(rows: Shipment[]): string[] {
	return [rows[0]?.id ?? '', rows.at(-1)?.id ?? '']
}

/** One mount to a forced layout, then a teardown, for each count of scopes, in `box`. */
function mounts(rows: Shipment[], box: HTMLElement, boxes: HTMLElement[]): Prepared[] {
	return Object.entries(SHAPES).map(([name, shape]) => ({
		name,
		run: async () => {
			show(box, boxes)

			const grid = mountGrid(box, rows, shape)

			await painted(box, ends(rows))

			restyle(box)

			grid.destroy()
		},
	}))
}

/** Mounts one grid for each count of scopes, and settles its first layout. */
async function mountAll(rows: Shipment[]): Promise<Mounted[]> {
	const grids: Mounted[] = []

	for (const [name, shape] of Object.entries(SHAPES)) {
		const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

		const grid = mountGrid(box, rows, shape)

		await painted(box, ends(rows))

		restyle(box)

		grids.push({ name, box, grid })
	}

	return grids
}

/**
 * Closes each grid over an asc/desc flip of the `id` sort. The ids are
 * zero-padded, so the ascending order is the order of the fixture. A flip
 * settles when the first body row shows the first id of the new order.
 */
function sorts(grids: Mounted[], rows: Shipment[], boxes: HTMLElement[]): Prepared[] {
	const [first, last] = ends(rows)

	return grids.map(({ name, box, grid }) => {
		let descending = false

		return {
			name,
			run: async () => {
				show(box, boxes)

				descending = !descending

				const lead = (descending ? last : first) ?? ''

				grid.sort(descending ? 'desc' : 'asc')

				await painted(box, [lead])

				if (box.querySelector('tbody tr td')?.textContent !== lead) {
					throw new Error(`grid bench did not lead with ${lead}`)
				}

				restyle(box)
			},
		}
	})
}

/** Closes each grid over a switch of the root density between `sm` and `lg`. */
function switches(grids: Mounted[], boxes: HTMLElement[]): Prepared[] {
	const root = document.documentElement

	return grids.map(({ name, box }) => {
		let loose = false

		return {
			name,
			run: async () => {
				show(box, boxes)

				loose = !loose

				writeRootDensity(root, loose ? 'lg' : 'sm')

				restyle(box)

				await task()

				restyle(box)
			},
		}
	})
}

/** Mounts one grid of the cache scenario for each entry of {@link CACHE_SCOPES}. */
async function mountCache(rows: Shipment[]): Promise<{ name: string; box: HTMLElement }[]> {
	const grids: { name: string; box: HTMLElement }[] = []

	for (const [name, getScope] of Object.entries(CACHE_SCOPES)) {
		const box = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

		createRoot(box).render(
			<Grid columns={cacheColumns(getScope)} rows={rows} getKey={shipmentKey} />,
		)

		await painted(box, ends(rows))

		restyle(box)

		grids.push({ name, box })
	}

	return grids
}

/** Closes each cache grid over a hide and a show, which computes the style of each element again. */
function reshows(grids: { name: string; box: HTMLElement }[], boxes: HTMLElement[]): Prepared[] {
	return grids.map(({ name, box }) => ({
		name,
		run: () => {
			show(box, boxes)

			box.hidden = true

			restyle(document.body)

			box.hidden = false

			restyle(box)
		},
	}))
}

/** The `Performance` metrics of the page, by name, in ms. */
async function metrics(): Promise<Record<string, number>> {
	const { metrics: list } = (await cdp().send('Performance.getMetrics')) as {
		metrics: { name: string; value: number }[]
	}

	return Object.fromEntries(list.map(({ name, value }) => [name, value * 1_000]))
}

/**
 * Logs the mean `RecalcStyleDuration` and `LayoutDuration` of {@link TRACED}
 * runs of each entry, after one run that is not counted. The figures include
 * the work of each frame that the browser draws while the runs wait.
 */
async function trace(scenario: string, prepared: Prepared[]) {
	for (const { name, run } of prepared) {
		await run()

		const before = await metrics()

		for (let count = 0; count < TRACED; count++) await run()

		const after = await metrics()

		const mean = (metric: string) =>
			(((after[metric] ?? 0) - (before[metric] ?? 0)) / TRACED).toFixed(1)

		console.log(
			`grid density · ${scenario} · ${name}: RecalcStyleDuration ${mean('RecalcStyleDuration')} ms, LayoutDuration ${mean('LayoutDuration')} ms`,
		)
	}
}

const rows = shipments(1_000)

const grids = await mountAll(rows)

const cached = await mountCache(rows)

/** The computed start padding of the first element in `box` that `selector` finds. */
function padding(box: HTMLElement, selector: string) {
	const element = box.querySelector(selector)

	return element ? getComputedStyle(element).paddingInlineStart : 'none'
}

// Proof of the shape that each row measures: the scopes above the table, the
// slots, and the padding of one badge, which shows the step that it takes.
for (const { name, box } of grids) {
	show(box, [box])

	const scopes = box.querySelectorAll('[data-density]:not([data-density=slot])').length

	const slots = box.querySelectorAll('tbody [data-density=slot]').length

	const badge = padding(box, 'tbody [data-slot=badge]')

	console.log(`grid density · ${name}: ${scopes} scopes, ${slots} slots, badge padding ${badge}`)
}

// Proof that the two cache grids have one geometry and different scopes.
for (const { name, box } of cached) {
	show(box, [box])

	const table = box.querySelector('tbody')

	const lg = box.querySelectorAll('tbody [data-density=lg]').length

	const cell = padding(box, 'tbody tr:nth-child(2) [data-density]')

	console.log(
		`grid density · cache · ${name}: ${lg} lg spans, body ${table?.scrollHeight}×${table?.scrollWidth} px, padding of a row-2 span ${cell}`,
	)
}

const mountBox = host({ width: GRID_WIDTH, height: GRID_HEIGHT })

const boxes = [mountBox, ...grids.map(({ box }) => box), ...cached.map(({ box }) => box)]

const mounted = mounts(rows, mountBox, boxes)

const sorted = sorts(grids, rows, boxes)

const switched = switches(grids, boxes)

const reshown = reshows(cached, boxes)

await cdp().send('Performance.enable', { timeDomain: 'timeTicks' })

await trace('mount', mounted)

await trace('sort', sorted)

await trace('root switch', switched)

await trace('cache · show', reshown)

await cdp().send('Performance.disable')

// The mounts and the sorts run at the `md` root, as the traced runs did.
writeRootDensity(document.documentElement, 'md')

compareBenches(
	'grid density · mount · 1,000 rows',
	(bench) => {
		benches(bench, mounted)
	},
	WINDOW.slow,
)

compareBenches(
	'grid density · sort · 1,000 rows · asc/desc flip',
	(bench) => {
		benches(bench, sorted)
	},
	WINDOW.slow,
)

compareBenches(
	'grid density · root switch sm/lg · 1,000 rows',
	(bench) => {
		benches(bench, switched)
	},
	WINDOW.slow,
)

compareBenches(
	'grid density · matched-properties cache · show · 1,000 rows',
	(bench) => {
		benches(bench, reshown)
	},
	WINDOW.slow,
)
