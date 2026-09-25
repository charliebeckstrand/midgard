// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { dragPreview } from '../../modules/dashboard/engine/dashboard-drag'
import type { DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'
import type { DashboardSelection } from '../../modules/dashboard/engine/dashboard-scope'
import {
	createDashboardStore,
	type DashboardState,
} from '../../modules/dashboard/engine/dashboard-store'

const initial = (patch: Partial<DashboardState> = {}): DashboardState => ({
	columns: 24,
	gap: 8,
	editing: true,
	layout: [
		{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
		{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
		{ id: 'c', x: 0, y: 10, w: 8, h: 10 },
	],
	demands: new Map([
		['a', {}],
		['b', {}],
		['c', {}],
	]),
	width: 0,
	gesture: null,
	filter: undefined,
	selections: [],
	...patch,
})

/** Whether each number of `cell` is finite. */
const finite = (cell: DashboardCell) => [cell.x, cell.y, cell.w, cell.h].every(Number.isFinite)

describe('createDashboardStore', () => {
	it('returns the same view for the same state', () => {
		const store = createDashboardStore(initial())

		expect(store.getView()).toBe(store.getView())
	})

	it('keeps each unmoved cell object across a preview', () => {
		const store = createDashboardStore(initial())

		const before = store.getView()

		const snapshot = [...before.cells.values()]

		const preview = dragPreview(snapshot, 'c', 16, 0, 24)

		store.setState({
			gesture: {
				kind: 'drag',
				id: 'c',
				snapshot,
				preview: preview?.cells ?? null,
				change: preview?.kind ?? null,
				partner: null,
				width: 0,
				pitch: 40,
				inline: 1,
			},
		})

		const after = store.getView()

		expect(after.cells.get('a')).toBe(before.cells.get('a'))

		expect(after.cells.get('b')).toBe(before.cells.get('b'))

		// The dragged tile stays on its start cell; the placeholder shows the landing.
		expect(after.cells.get('c')).toBe(before.cells.get('c'))

		expect(after.placeholder).toMatchObject({ id: 'c', x: 16, y: 0 })

		expect(after.travel).toEqual({ maxX: 16, maxY: 10 })
	})

	it('keeps cell objects when a new layout array holds the same geometry', () => {
		const store = createDashboardStore(initial())

		const before = store.getView()

		store.setState({ layout: initial().layout.map((item) => ({ ...item })) })

		expect(store.getView().cells.get('a')).toBe(before.cells.get('a'))
	})

	it('stands editing down while the projection is live', () => {
		const store = createDashboardStore(
			initial({ demands: new Map([['a', { minWidth: 600 }]]), width: 400 }),
		)

		expect(store.getView()).toMatchObject({ projected: true, editable: false })
	})

	it('holds the start width through a gesture', () => {
		const store = createDashboardStore(
			initial({ demands: new Map([['a', { minWidth: 300 }]]), width: 1200 }),
		)

		const snapshot = [...store.getView().cells.values()]

		store.setState({
			gesture: {
				kind: 'resize',
				id: 'a',
				snapshot,
				preview: null,
				change: null,
				partner: null,
				width: 1200,
				pitch: 50,
				inline: 1,
			},
		})

		store.setState({ width: 300 })

		expect(store.getView().projected).toBe(false)

		store.setState({ gesture: null })

		expect(store.getView().projected).toBe(true)
	})

	it('reads a ratio that is not a finite number above 0 as no ratio', () => {
		for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			const store = createDashboardStore(initial())

			store.register('a', { ratio })

			// Tile a keeps its saved height, so no tile goes to an infinite row.
			expect(store.getView().cells.get('a')).toMatchObject({ y: 0, h: 10 })

			expect([...store.getView().cells.values()].every(finite)).toBe(true)
		}
	})

	it('reads a minWidth that is not a finite number of 0 or more as no floor', () => {
		for (const minWidth of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
			// Tile b starves at 400 px, so the projection runs and reads the floor of a.
			const store = createDashboardStore(initial({ width: 400 }))

			store.register('a', { minWidth })

			store.register('b', { minWidth: 600 })

			expect(store.getState().demands.get('a')?.minWidth).toBeUndefined()

			expect(store.getView().projected).toBe(true)

			expect([...store.getView().cells.values()].every(finite)).toBe(true)
		}
	})

	it('reads the first entry of a repeated id before a tile registers, as the board resolves it', () => {
		// No tile registers on the server, so the entries and the order paint the server markup.
		const store = createDashboardStore(
			initial({
				demands: new Map(),
				layout: [
					{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
					{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
					{ id: 'a', x: 16, y: 20, w: 8, h: 10 },
				],
			}),
		)

		expect(store.getView().entries.get('a')).toMatchObject({ x: 0, y: 0 })

		expect(store.getView().order).toEqual(['a', 'b'])
	})

	it('places a clamped entry that covers another entry on a new row before a tile registers', () => {
		// Tiles a and b have no h, as a tile with a fixed ratio saves them.
		const layout = [
			{ id: 'a', x: 0, y: 0, w: 8 },
			{ id: 'b', x: 16, y: 0, w: 8 },
			{ id: 'c', x: 0, y: 18, w: 12, h: 10 },
		]

		// At 12 columns, the clamp puts b on a. No tile registers on the server.
		const store = createDashboardStore(initial({ columns: 12, demands: new Map(), layout }))

		const { entries, order } = store.getView()

		expect(entries.get('a')).toBe(layout[0])

		// No ratio is known yet, so a holds the default height of 18 rows. Entry b keeps no h.
		expect(entries.get('b')).toStrictEqual({ id: 'b', x: 0, y: 28, w: 8 })

		expect(order).toEqual(['a', 'c', 'b'])
	})

	it('applies the selection of a tile with an entry until a tile registers, then of a registered tile', () => {
		const selections: DashboardSelection[] = [
			{ source: 'a', field: 'region', values: ['North'] },
			{ source: 'gone', field: 'region', values: ['West'] },
			{ source: '', field: 'product', values: ['Tea'] },
		]

		const store = createDashboardStore(initial({ demands: new Map(), selections }))

		// No tile registers on the server, so the saved entries stand for the tiles.
		expect(store.getView().selections).toEqual([selections[0], selections[2]])

		store.register('a', {})

		store.register('b', {})

		store.unregister('a')

		expect(store.getView().selections).toEqual([selections[2]])

		store.unregister('b')

		// No tile is left, so only the selection of the board applies.
		expect(store.getView().selections).toEqual([selections[2]])

		// A hydration render reads the view that the server rendered.
		expect(store.getInitialView().selections).toEqual([selections[0], selections[2]])

		expect(store.getInitialState()).toMatchObject({ selections, demands: new Map() })
	})

	it('registers and unregisters demands, and notifies each change', () => {
		const store = createDashboardStore(initial({ demands: new Map() }))

		const listener = vi.fn()

		store.subscribe(listener)

		store.register('a', { ratio: 16 / 9 })

		expect(store.getView().cells.get('a')).toMatchObject({ w: 8, h: 18 })

		store.unregister('a')

		expect(store.getView().cells.has('a')).toBe(false)

		expect(listener).toHaveBeenCalledTimes(2)
	})

	it('notifies no listener while closed, and catches up once when it opens', () => {
		const store = createDashboardStore(initial())

		const listener = vi.fn()

		store.subscribe(listener)

		store.close()

		store.unregister('a')

		store.unregister('b')

		expect(listener).not.toHaveBeenCalled()

		// A read of a closed store still sees the current state.
		expect([...store.getView().cells.keys()]).toEqual(['c'])

		store.open()

		expect(listener).toHaveBeenCalledOnce()

		expect([...store.getView().cells.keys()]).toEqual(['c'])
	})
})
