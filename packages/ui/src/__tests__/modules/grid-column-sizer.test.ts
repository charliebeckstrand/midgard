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
	space: number
	/** The widest body cell of each column. */
	bodies: Record<string, number>
	/** The header floor of each column; 40 when absent. */
	floors?: Record<string, number>
	/** Body cells the DOM holds; zero is a loading skeleton. */
	cells?: number
	seeded?: Record<string, number>
}) {
	const state: Record<string, number> = { ...args.seeded }

	const grid = {
		columns: args.columns,
		space: args.space,
		bodies: { ...args.bodies },
		cells: args.cells ?? 3,
		reads: 0,
		scans: [] as string[][],
		state,
	}

	const measure = (scan: ReadonlySet<string>): ColumnMeasurement => {
		grid.reads++

		grid.scans.push([...scan])

		const floors = new Map(grid.columns.map((col) => [String(col.id), args.floors?.[col.id] ?? 40]))

		const bodies = new Map(
			grid.cells > 0
				? [...scan].flatMap((id) => {
						const body = grid.bodies[id]

						return body == null ? [] : [[id, body] as const]
					})
				: [],
		)

		return { floors, bodies, cells: grid.cells }
	}

	const env = (): ColumnSizerEnv<Row> => ({
		columns: grid.columns,
		space: grid.space,
		sizeOf: (id) => grid.state[id] ?? 150,
		measure,
	})

	const apply = (write: ColumnSizingWrite | null) => {
		if (!write) return

		if (write.replace) {
			for (const id of Object.keys(grid.state)) delete grid.state[id]
		}

		Object.assign(grid.state, write.sizing)
	}

	const sizer = createColumnSizer({
		floors: new Map(),
		seeded: Object.keys(args.seeded ?? {}),
	})

	return { grid, env, apply, sizer }
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

		it('caps a runaway column', () => {
			const { env, sizer } = fakeGrid({ columns, space: 300, bodies: { ...bodies, c: 2000 } })

			expect(sizer.refit(env(), true).sizing.c).toBe(DEFAULT_CONTENT_MAX)
		})

		it('holds a width-seeded column at its seed', () => {
			const seeded = [column('a', { width: '250px' }), column('b')]

			const { env, sizer } = fakeGrid({ columns: seeded, space: 600, bodies })

			const write = sizer.refit(env(), true)

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
