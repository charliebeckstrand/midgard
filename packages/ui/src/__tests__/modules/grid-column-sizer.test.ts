// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { DEFAULT_CONTENT_MAX } from '../../modules/grid/engine/grid-constants'
import type { GridFitPlan } from '../../modules/grid/engine/grid-sizing/fit-layout'
import type { ColumnMeasurement } from '../../modules/grid/engine/grid-sizing/measure'
import {
	type ColumnSizerEnv,
	type ColumnSizingWrite,
	contentWidth,
	createColumnSizer,
} from '../../modules/grid/engine/grid-sizing/sizer'

type Row = { id: number }

/** A width-less data column, with the given overrides. */
const column = (id: string, over: Partial<GridColumn<Row>> = {}): GridColumn<Row> => ({
	id,
	title: id,
	cell: () => id,
	...over,
})

/**
 * A fake grid: the facts its DOM would report, and an engine sizing state that
 * each write updates as the table hook does. `reads` counts the measurements,
 * and `plans` holds each fit layout that the sizer asked for.
 *
 * The fake browser lays a fit out as a plain proportional fill: a kept column
 * keeps its width, and a content-sized column takes its content. Each other
 * column takes its content (its floor, its body up to the cap, and its grown
 * width), and the spare width of `space` scales those columns up.
 */
function fakeGrid(args: {
	columns: GridColumn<Row>[]
	/** The width of the container that the fake browser fills. */
	space: number
	/** The widest body cell of each column. */
	bodies: Record<string, number>
	/** The header floor of each column; 40 when absent. */
	floors?: Record<string, number>
	/** The width that the fake browser gives a header, when it is not the measured floor. */
	headers?: Record<string, number>
	/** Body cells the DOM holds; zero is a loading skeleton. */
	cells?: number
	seeded?: Record<string, number>
	/** The content width of each content-sized column. */
	fits?: Record<string, number>
}) {
	const state: Record<string, number> = { ...args.seeded }

	const grid = {
		columns: args.columns,
		space: args.space,
		bodies: { ...args.bodies },
		cells: args.cells ?? 3,
		reads: 0,
		scans: [] as string[][],
		plans: [] as Omit<GridFitPlan, 'mode'>[],
		state,
	}

	const fit = (plan: Omit<GridFitPlan, 'mode'>): ReadonlyMap<string, number> => {
		grid.plans.push(plan)

		const widths = new Map<string, number>()

		let free = grid.space

		const fill: [string, number][] = []

		for (const col of grid.columns) {
			const id = String(col.id)

			const fixed = plan.kept.get(id) ?? args.fits?.[id]

			if (fixed != null) {
				widths.set(id, fixed)

				free -= fixed

				continue
			}

			const body = Math.min(grid.bodies[id] ?? 0, DEFAULT_CONTENT_MAX)

			const header = args.headers?.[id] ?? args.floors?.[id] ?? 40

			fill.push([id, Math.max(header, body, plan.grow.get(id) ?? 0)])
		}

		const content = fill.reduce((sum, [, width]) => sum + width, 0)

		const scale = Math.max(1, free / content)

		for (const [id, width] of fill) widths.set(id, width * scale)

		return widths
	}

	const measure = (scan: ReadonlySet<string>): ColumnMeasurement => {
		grid.reads++

		grid.scans.push([...scan])

		const floors = new Map(
			grid.columns
				.filter((col) => !col.actions)
				.map((col) => [String(col.id), args.floors?.[col.id] ?? 40]),
		)

		const bodies = new Map(
			grid.cells > 0
				? [...scan].flatMap((id) => {
						const body = grid.bodies[id]

						return body == null ? [] : [[id, body] as const]
					})
				: [],
		)

		const fits = new Map(Object.entries(args.fits ?? {}))

		return { floors, bodies, cells: grid.cells, fits }
	}

	const env = (): ColumnSizerEnv<Row> => ({
		columns: grid.columns,
		getSize: (id) => grid.state[id] ?? 150,
		measure,
		fit,
	})

	const apply = (write: ColumnSizingWrite | null) => {
		if (!write) return

		if (write.replace) {
			for (const id of Object.keys(grid.state)) delete grid.state[id]
		}

		Object.assign(grid.state, write.sizing)
	}

	const floors = new Map<string, number>()

	const sizer = createColumnSizer({ floors, seeded: Object.keys(args.seeded ?? {}) })

	return { grid, env, apply, sizer, floors }
}

/** Sum of a sizing's widths. */
const total = (sizing: Record<string, number>) =>
	Object.values(sizing).reduce((sum, width) => sum + width, 0)

describe('contentWidth', () => {
	it('is the wider of the header floor and the widest body cell', () => {
		expect(contentWidth(column('a'), 60, 120, true)).toBe(120)

		expect(contentWidth(column('a'), 90, 30, true)).toBe(90)
	})

	it('caps a width-less column only when capped', () => {
		expect(contentWidth(column('a'), 40, 900, true)).toBe(DEFAULT_CONTENT_MAX)

		expect(contentWidth(column('a'), 40, 900, false)).toBe(900)
	})

	it('caps at a declared maxWidth either way', () => {
		const col = column('a', { maxWidth: 300 })

		expect(contentWidth(col, 40, 900, true)).toBe(300)

		expect(contentWidth(col, 40, 900, false)).toBe(300)
	})
})

describe('createColumnSizer', () => {
	const columns = [column('a'), column('b'), column('c')]

	const bodies = { a: 60, b: 90, c: 120 }

	describe('the automatic fit', () => {
		it('fills the space in auto mode', () => {
			const { env, sizer } = fakeGrid({ columns, space: 600, bodies })

			const write = sizer.refit(env(), true)

			expect(sizer.mode()).toBe('auto')

			expect(write.persist).toBe('none')

			expect(total(write.sizing)).toBe(600)
		})

		it('reuses the cached facts on a width-only pass', () => {
			const { grid, env, sizer } = fakeGrid({ columns, space: 600, bodies })

			sizer.refit(env(), true)

			grid.space = 900

			const write = sizer.refit(env(), false)

			expect(grid.reads).toBe(1)

			expect(total(write.sizing)).toBe(900)
		})

		it('measures again after a provisional pass', () => {
			const { grid, env, sizer } = fakeGrid({ columns, space: 600, bodies, cells: 0 })

			sizer.refit(env(), true)

			expect(sizer.measured()).toBe(false)

			grid.cells = 3

			sizer.refit(env(), false)

			expect(grid.reads).toBe(2)

			expect(sizer.measured()).toBe(true)
		})

		it('keeps the widths that the browser lays out', () => {
			const { env, sizer } = fakeGrid({ columns, space: 540, bodies })

			// The fake browser scales the content (60, 90, 120) by 2.
			expect(sizer.refit(env(), true).sizing).toEqual({ a: 120, b: 180, c: 240 })
		})

		it('lays the first pass out as the render painted it', () => {
			const { grid, env, sizer } = fakeGrid({ columns, space: 600, bodies })

			sizer.refit(env(), true)

			expect(grid.plans[0]?.grow.size).toBe(0)

			expect(grid.plans[0]?.kept.size).toBe(0)
		})

		it('takes a fitted width under the measured floor as the floor', () => {
			// The measured floor rounds up, so it can be more than the width that the
			// browser gives the whole header.
			const { env, sizer, floors } = fakeGrid({
				columns,
				space: 0,
				bodies: { a: 20, b: 20, c: 20 },
				floors: { a: 95 },
				headers: { a: 93.4 },
			})

			expect(sizer.refit(env(), true).sizing.a).toBe(93.4)

			expect(floors.get('a')).toBe(93.4)

			expect(floors.get('b')).toBe(40)
		})

		it('holds the width of a wider row that left the view', () => {
			const { grid, env, apply, sizer } = fakeGrid({ columns, space: 300, bodies })

			grid.bodies.a = 200

			apply(sizer.refit(env(), true))

			grid.bodies.a = 60

			sizer.refit(env(), true)

			expect(grid.plans[1]?.grow).toEqual(new Map([['a', 200]]))
		})

		it('holds a grown width under the content cap', () => {
			const { grid, env, apply, sizer } = fakeGrid({ columns, space: 300, bodies })

			grid.bodies.c = 2000

			apply(sizer.refit(env(), true))

			grid.bodies.c = 120

			sizer.refit(env(), true)

			expect(grid.plans[1]?.grow.get('c')).toBe(DEFAULT_CONTENT_MAX)
		})

		it('holds a width-seeded column at its seed', () => {
			const seeded = [column('a', { width: '250px' }), column('b')]

			const { grid, env, sizer } = fakeGrid({ columns: seeded, space: 600, bodies })

			const write = sizer.refit(env(), true)

			expect(grid.plans[0]?.kept).toEqual(new Map([['a', 250]]))

			expect(write.sizing).toEqual({ b: 350 })
		})
	})

	describe('manual control', () => {
		it('holds every column through a later width-only pass', () => {
			const { grid, env, apply, sizer } = fakeGrid({ columns, space: 600, bodies })

			apply(sizer.refit(env(), true))

			// A drag: the user widens `a`, and the grid hands control over.
			grid.state.a = 280

			sizer.takeControl(columns)

			grid.space = 800

			expect(sizer.refit(env(), false).sizing).toEqual({})

			expect(sizer.mode()).toBe('manual')
		})

		it('sizes a later column to its content without a fill', () => {
			const { grid, env, apply, sizer } = fakeGrid({ columns, space: 600, bodies })

			apply(sizer.refit(env(), true))

			sizer.takeControl(columns)

			grid.columns = [...columns, column('d')]

			grid.bodies.d = 70

			expect(sizer.refit(env(), true).sizing).toEqual({ d: 70 })
		})

		it('mounts in manual mode with saved widths', () => {
			const { env, sizer } = fakeGrid({
				columns,
				space: 600,
				bodies,
				seeded: { a: 200, b: 200, c: 200 },
			})

			expect(sizer.mode()).toBe('manual')

			expect(sizer.refit(env(), true).sizing).toEqual({})
		})
	})

	describe('the auto-size actions', () => {
		it('sizes one column to its content and holds the others', () => {
			const { grid, env, apply, sizer } = fakeGrid({ columns, space: 600, bodies })

			apply(sizer.refit(env(), true))

			const before = { ...grid.state }

			const write = sizer.sizeColumn(env(), 'a')

			expect(write).toEqual({ sizing: { a: 60 }, replace: false, persist: 'widths' })

			apply(write)

			// A container resize moves no column: every column is held.
			grid.space = 900

			expect(sizer.refit(env(), false).sizing).toEqual({})

			expect(grid.state.b).toBe(before.b)
		})

		it('gives each column the width "Auto-size this column" gives it', () => {
			const wide = { a: 60, b: 900, c: 30 }

			const each = Object.fromEntries(
				columns.map((col) => {
					const { env, sizer } = fakeGrid({ columns, space: 600, bodies: wide })

					return [col.id, sizer.sizeColumn(env(), String(col.id))?.sizing[col.id]]
				}),
			)

			const { env, sizer } = fakeGrid({ columns, space: 600, bodies: wide })

			expect(sizer.sizeAll(env()).sizing).toEqual(each)
		})

		it('measures each column afresh, not from its running maximum', () => {
			const { grid, env, apply, sizer } = fakeGrid({ columns, space: 600, bodies })

			apply(sizer.refit(env(), true))

			// A wider row that has since left the view.
			grid.bodies.a = 200

			apply(sizer.refit(env(), true))

			grid.bodies.a = 60

			expect(sizer.sizeColumn(env(), 'a')?.sizing.a).toBe(60)
		})

		it('releases a width seed', () => {
			const seeded = [column('a', { width: '250px' }), column('b')]

			const { env, sizer } = fakeGrid({ columns: seeded, space: 600, bodies })

			expect(sizer.sizeColumn(env(), 'a')?.sizing).toEqual({ a: 60 })
		})

		it('ignores a non-data column', () => {
			const withSelect = [{ id: 'select', selectable: true } as GridColumn<Row>, ...columns]

			const { env, sizer } = fakeGrid({ columns: withSelect, space: 600, bodies })

			expect(sizer.sizeColumn(env(), 'select')).toBeNull()

			expect(Object.keys(sizer.sizeAll(env()).sizing)).toEqual(['a', 'b', 'c'])
		})

		it('keeps its content width through a structural change', () => {
			const { grid, env, apply, sizer } = fakeGrid({
				columns,
				space: 600,
				bodies: { ...bodies, c: 2000 },
			})

			apply(sizer.sizeAll(env()))

			expect(grid.state.c).toBe(2000)

			// Hide a column, and drop the cached content as a structural change does.
			grid.columns = columns.slice(1)

			sizer.forget()

			apply(sizer.refit(env(), true))

			expect(grid.state.c).toBe(2000)
		})
	})

	describe('reset', () => {
		it('gives the widths back to the grid and clears the saved widths', () => {
			const { grid, env, apply, sizer } = fakeGrid({
				columns,
				space: 600,
				bodies,
				seeded: { a: 300, b: 100, c: 100 },
			})

			const write = sizer.reset(env())

			expect(write.replace).toBe(true)

			expect(write.persist).toBe('clear')

			expect(sizer.mode()).toBe('auto')

			apply(write)

			expect(total(grid.state)).toBe(600)

			// Auto mode again: a container resize fits the columns.
			grid.space = 900

			expect(total(sizer.refit(env(), false).sizing)).toBe(900)
		})

		it('restores a released width seed', () => {
			const seeded = [column('a', { width: '250px' }), column('b')]

			const { grid, env, apply, sizer } = fakeGrid({ columns: seeded, space: 600, bodies })

			apply(sizer.sizeAll(env()))

			const write = sizer.reset(env())

			apply(write)

			// The seed drops out of the state, so the engine shows `width` again, and the
			// fill spends the rest around it.
			expect(grid.state).toEqual({ b: 350 })
		})
	})
})

describe('a content-sized column', () => {
	const actions = column('actions', { actions: () => null })

	const columns = [column('a'), column('b'), actions]

	const bodies = { a: 60, b: 90 }

	it('takes its content width and none of the spare width', () => {
		const { env, sizer } = fakeGrid({ columns, space: 600, bodies, fits: { actions: 84 } })

		const write = sizer.refit(env(), true)

		expect(write.sizing.actions).toBe(84)

		expect(total(write.sizing)).toBe(600)
	})

	it('keeps its content width after the user takes control', () => {
		const { env, apply, sizer } = fakeGrid({ columns, space: 600, bodies, fits: { actions: 84 } })

		apply(sizer.refit(env(), true))

		sizer.takeControl(columns)

		expect(sizer.refit(env(), true).sizing.actions).toBe(84)
	})

	it('keeps a declared width', () => {
		const fixed = column('actions', { actions: () => null, width: 120 })

		const { env, sizer } = fakeGrid({
			columns: [column('a'), fixed],
			space: 600,
			bodies,
			fits: { actions: 84 },
		})

		expect(sizer.refit(env(), true).sizing.actions).toBeUndefined()
	})
})
