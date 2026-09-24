// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { dragPreview } from '../../modules/dashboard/engine/dashboard-drag'
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

	it('registers and unregisters demands, and notifies each change', () => {
		const store = createDashboardStore(initial({ demands: new Map() }))

		const listener = vi.fn()

		store.subscribe(listener)

		const unregister = store.register('a', { ratio: 16 / 9 })

		expect(store.getView().cells.get('a')).toMatchObject({ w: 8, h: 18 })

		unregister()

		expect(store.getView().cells.has('a')).toBe(false)

		expect(listener).toHaveBeenCalledTimes(2)
	})
})
