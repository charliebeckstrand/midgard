// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { DEFAULT_CONTENT_MAX } from '../../modules/grid/engine/grid-constants'
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
 * each write updates as the table hook does. `reads` counts the measurements.
 */
function fakeGrid(args: {
	columns: GridColumn<Row>[]
	/** The widest body cell of each column, and its widest leaf. */
	bodies: Record<string, number>
	/** The header floor of each column; 40 when absent. */
	floors?: Record<string, number>
	/** The width that the header of each column needs to show its title in full; 0 when absent. */
	titles?: Record<string, number>
	/** The width that the browser gives a header; wider than each body when absent. */
	rendered?: Record<string, number>
	/** Body cells the DOM holds; zero is a loading skeleton. */
	cells?: number
	seeded?: Record<string, number>
	/** The content width of each content-sized column. */
	fits?: Record<string, number>
}) {
	const state: Record<string, number> = { ...args.seeded }

	const grid = {
		columns: args.columns,
		bodies: { ...args.bodies },
		rendered: { ...args.rendered },
		cells: args.cells ?? 3,
		reads: 0,
		state,
	}

	const measure = (scan: ReadonlySet<string>): ColumnMeasurement => {
		grid.reads++

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

		const rendered = new Map(
			[...scan].map((id) => [id, grid.rendered[id] ?? Number.MAX_SAFE_INTEGER] as const),
		)

		const titles = new Map(
			grid.columns
				.filter((col) => !col.actions)
				.map((col) => [String(col.id), args.titles?.[col.id] ?? 0]),
		)

		const fits = new Map(Object.entries(args.fits ?? {}))

		return { floors, titles, bodies, cells: grid.cells, fits, leaves: new Map(bodies), rendered }
	}

	const env = (): ColumnSizerEnv<Row> => ({
		columns: grid.columns,
		getSize: (id) => grid.state[id] ?? 150,
		measure,
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

	describe('the automatic layout', () => {
		it('reads the content of the rendered rows into the least widths', () => {
			const { env, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			expect(sizer.mode()).toBe('auto')

			expect(sizer.least()).toEqual(new Map(Object.entries(bodies)))
		})

		it('holds no column wider than the browser laid it out on the first pass', () => {
			const { env, sizer } = fakeGrid({ columns, bodies, rendered: { a: 55.5 } })

			sizer.observe(env(), true)

			expect(sizer.least().get('a')).toBe(55.5)
		})

		it('reads a later row past the width on the screen', () => {
			// The held layout lays a later row out at the least width, so the screen
			// does not bound it.
			const { grid, env, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			grid.bodies.a = 200

			grid.rendered.a = 60

			sizer.observe(env(), false)

			expect(sizer.least().get('a')).toBe(200)
		})

		it('holds the width of a wider row that left the view', () => {
			const { grid, env, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			grid.bodies.a = 200

			sizer.observe(env(), false)

			grid.bodies.a = 60

			sizer.observe(env(), false)

			expect(sizer.least().get('a')).toBe(200)
		})

		it('reads the least widths again on a replace', () => {
			const { grid, env, sizer } = fakeGrid({ columns, bodies: { ...bodies, a: 200 } })

			sizer.observe(env(), true)

			grid.bodies.a = 60

			sizer.observe(env(), true)

			expect(sizer.least().get('a')).toBe(60)
		})

		it('keeps the least widths through a provisional pass', () => {
			const { grid, env, sizer } = fakeGrid({ columns, bodies, cells: 0 })

			sizer.observe(env(), true)

			expect(sizer.measured()).toBe(false)

			expect(sizer.least().size).toBe(0)

			grid.cells = 3

			sizer.observe(env(), false)

			expect(sizer.measured()).toBe(true)

			expect(sizer.least().size).toBe(3)
		})

		it('keeps the identity of the least widths when a pass moves none', () => {
			const { env, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			const least = sizer.least()

			sizer.observe(env(), false)

			expect(sizer.least()).toBe(least)
		})

		it('holds no least width for a width-seeded column', () => {
			const seeded = [column('a', { width: '250px' }), column('b')]

			const { env, sizer } = fakeGrid({ columns: seeded, bodies })

			sizer.observe(env(), true)

			expect([...sizer.least().keys()]).toEqual(['b'])
		})
	})

	describe('manual control', () => {
		it('holds every column through a later pass', () => {
			const { grid, env, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			// A drag: the user widens `a`, and the grid hands control over.
			grid.state.a = 280

			sizer.takeControl(columns)

			expect(sizer.refit(env(), false).sizing).toEqual({})

			expect(sizer.mode()).toBe('manual')
		})

		it('sizes a later column to its content without a fill', () => {
			const { grid, env, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			sizer.takeControl(columns)

			grid.columns = [...columns, column('d')]

			grid.bodies.d = 70

			expect(sizer.refit(env(), true).sizing).toEqual({ d: 70 })
		})

		it('mounts in manual mode with saved widths', () => {
			const { env, sizer } = fakeGrid({
				columns,
				bodies,
				seeded: { a: 200, b: 200, c: 200 },
			})

			expect(sizer.mode()).toBe('manual')

			expect(sizer.refit(env(), true).sizing).toEqual({})
		})
	})

	describe('the auto-size actions', () => {
		it('sizes one column to its content and holds the others', () => {
			const { env, apply, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			const write = sizer.sizeColumn(env(), 'a')

			expect(write).toEqual({ sizing: { a: 60 }, replace: false, persist: 'widths' })

			apply(write)

			// Every column is held, so a later pass sizes none.
			expect(sizer.mode()).toBe('manual')

			expect(sizer.refit(env(), false).sizing).toEqual({})
		})

		it('gives each column the width "Auto-size this column" gives it', () => {
			const wide = { a: 60, b: 900, c: 30 }

			const each = Object.fromEntries(
				columns.map((col) => {
					const { env, sizer } = fakeGrid({ columns, bodies: wide })

					return [col.id, sizer.sizeColumn(env(), String(col.id))?.sizing[col.id]]
				}),
			)

			const { env, sizer } = fakeGrid({ columns, bodies: wide })

			expect(sizer.sizeAll(env()).sizing).toEqual(each)
		})

		it('measures each column afresh, not from its running maximum', () => {
			const { grid, env, sizer } = fakeGrid({ columns, bodies })

			sizer.observe(env(), true)

			// A wider row that has since left the view.
			grid.bodies.a = 200

			sizer.observe(env(), false)

			grid.bodies.a = 60

			expect(sizer.sizeColumn(env(), 'a')?.sizing.a).toBe(60)
		})

		// An empty result or a loading skeleton renders no body cell. The header
		// still shows its title in full, so both actions must keep that width and
		// not only the floor, which lets a multi-word title truncate.
		it('keeps the full header title of a column that rendered no body cell', () => {
			const titled = [column('estimate', { title: 'Estimate (hours)' }), column('b')]

			const grid = () =>
				fakeGrid({
					columns: titled,
					bodies: {},
					floors: { estimate: 64, b: 40 },
					titles: { estimate: 140, b: 30 },
					cells: 0,
				})

			const one = grid()

			expect(one.sizer.sizeColumn(one.env(), 'estimate')?.sizing).toEqual({ estimate: 140 })

			const all = grid()

			expect(all.sizer.sizeAll(all.env()).sizing).toEqual({ estimate: 140, b: 40 })
		})

		it('releases a width seed', () => {
			const seeded = [column('a', { width: '250px' }), column('b')]

			const { env, sizer } = fakeGrid({ columns: seeded, bodies })

			expect(sizer.sizeColumn(env(), 'a')?.sizing).toEqual({ a: 60 })
		})

		it('ignores a non-data column', () => {
			const withSelect = [{ id: 'select', selectable: true } as GridColumn<Row>, ...columns]

			const { env, sizer } = fakeGrid({ columns: withSelect, bodies })

			expect(sizer.sizeColumn(env(), 'select')).toBeNull()

			expect(Object.keys(sizer.sizeAll(env()).sizing)).toEqual(['a', 'b', 'c'])
		})

		it('keeps its content width through a structural change', () => {
			const { grid, env, apply, sizer } = fakeGrid({
				columns,
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
		it('gives the widths back to the browser and clears the saved widths', () => {
			const { grid, env, apply, sizer } = fakeGrid({
				columns,
				bodies,
				seeded: { a: 300, b: 100, c: 100 },
			})

			sizer.observe(env(), true)

			const write = sizer.reset()

			expect(write).toEqual({ sizing: {}, replace: true, persist: 'clear' })

			expect(sizer.mode()).toBe('auto')

			expect(sizer.least().size).toBe(0)

			apply(write)

			expect(grid.state).toEqual({})
		})

		it('restores a released width seed', () => {
			const seeded = [column('a', { width: '250px' }), column('b')]

			const { env, sizer } = fakeGrid({ columns: seeded, bodies })

			sizer.sizeAll(env())

			sizer.reset()

			sizer.observe(env(), true)

			// The seed sits out the least widths again, so the column keeps `width`.
			expect([...sizer.least().keys()]).toEqual(['b'])
		})
	})
})

describe('a content-sized column', () => {
	const actions = column('actions', { actions: () => null })

	const columns = [column('a'), column('b'), actions]

	const bodies = { a: 60, b: 90 }

	it('takes its content width in the fixed layout', () => {
		const { env, sizer } = fakeGrid({ columns, bodies, fits: { actions: 84 } })

		expect(sizer.refit(env(), true).sizing.actions).toBe(84)
	})

	it('keeps its content width after the user takes control', () => {
		const { env, sizer } = fakeGrid({ columns, bodies, fits: { actions: 84 } })

		sizer.observe(env(), true)

		sizer.takeControl(columns)

		expect(sizer.refit(env(), true).sizing.actions).toBe(84)
	})

	it('keeps a declared width', () => {
		const fixed = column('actions', { actions: () => null, width: 120 })

		const { env, sizer } = fakeGrid({
			columns: [column('a'), fixed],
			bodies,
			fits: { actions: 84 },
		})

		expect(sizer.refit(env(), true).sizing.actions).toBeUndefined()
	})
})
