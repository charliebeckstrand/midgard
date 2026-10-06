import type {
	Announcements,
	DragEndEvent,
	DragMoveEvent,
	DragStartEvent,
	KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { renderHook } from '@testing-library/react'
import { createRef, type RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ROW_SUBDIVISION } from '../../modules/dashboard/engine/dashboard-layout'
import {
	createDashboardStore,
	type DashboardState,
	type DashboardStore,
} from '../../modules/dashboard/engine/dashboard-store'
import { useDashboardDrag } from '../../modules/dashboard/use-dashboard-drag'

// dnd-kit runs the sensors and calls these handlers. The cases call the
// handlers directly, which is the synchronous seam of the hook.

/** Three unlabeled tiles on a 24-column board, in edit mode. */
function makeStore(patch: Partial<DashboardState> = {}): DashboardStore {
	return createDashboardStore({
		columns: 24,
		gap: 8,
		editing: true,
		layout: [
			{ id: 'alpha', x: 0, y: 0, w: 8, h: 10 },
			{ id: 'beta', x: 8, y: 0, w: 8, h: 10 },
			{ id: 'gamma', x: 0, y: 10, w: 8, h: 10 },
		],
		demands: new Map([
			['alpha', {}],
			['beta', {}],
			['gamma', {}],
		]),
		declared: new Set(),
		width: 1200,
		heights: new Map(),
		gesture: null,
		filter: undefined,
		selections: [],
		...patch,
	})
}

/** A canvas 1200 px wide, so one column is 50 px. */
function makeCanvas(): RefObject<HTMLElement | null> {
	const canvas = document.createElement('div')

	Object.defineProperty(canvas, 'clientWidth', { value: 1200 })

	const ref = createRef<HTMLElement | null>()

	;(ref as { current: HTMLElement | null }).current = canvas

	return ref
}

const active = (id: string) => ({ active: { id } })

const start = (id: string) => active(id) as unknown as DragStartEvent

const move = (id: string, x: number, y = 0) =>
	({ ...active(id), delta: { x, y } }) as unknown as DragMoveEvent

type AnnounceArgs = Parameters<Announcements['onDragEnd']>[0]

const announce = (id: string) => ({ ...active(id), over: null }) as unknown as AnnounceArgs

function renderDrag(store: DashboardStore, canvasRef = makeCanvas()) {
	const onDragStart = vi.fn()
	const onDragEnd = vi.fn()

	const hook = renderHook(() =>
		useDashboardDrag({
			store,
			canvasRef,
			commit: (cells) => ({ layout: cells, kept: true }),
			onDragStart,
			onDragEnd,
		}),
	)

	const { context } = hook.result.current

	const announcements = context.accessibility?.announcements as Announcements

	return { ...hook, context, announcements, onDragStart, onDragEnd }
}

/** The keyboard coordinate getter that the hook gives to the keyboard sensor. */
function coordinateGetterOf(context: ReturnType<typeof renderDrag>['context']) {
	const getter = context.sensors
		?.map((descriptor) => (descriptor.options as { coordinateGetter?: unknown }).coordinateGetter)
		.find((option) => option !== undefined)

	return getter as KeyboardCoordinateGetter
}

/** Calls the getter for the key `code` from the origin. */
function step(getter: KeyboardCoordinateGetter, code: string) {
	return getter(new KeyboardEvent('keydown', { code }), {
		currentCoordinates: { x: 0, y: 0 },
	} as unknown as Parameters<KeyboardCoordinateGetter>[1])
}

describe('useDashboardDrag', () => {
	it('clears the preview when the tile travels back to its start cell', () => {
		const store = makeStore()

		const { context } = renderDrag(store)

		context.onDragStart?.(start('alpha'))

		// Eight columns to the right lands on beta, which shifts.
		context.onDragMove?.(move('alpha', 400))

		expect(store.getState().gesture).toMatchObject({ change: 'shift', partner: 'beta' })

		context.onDragMove?.(move('alpha', 0))

		expect(store.getState().gesture).toMatchObject({ preview: null, change: null, partner: null })
	})

	it('starts no gesture and says nothing for a drag with no canvas', () => {
		const store = makeStore()

		const { context, announcements, onDragStart } = renderDrag(store, createRef<HTMLElement>())

		context.onDragStart?.(start('alpha'))

		expect(store.getState().gesture).toBeNull()

		expect(onDragStart).not.toHaveBeenCalled()

		expect(announcements.onDragStart(announce('alpha'))).toBeUndefined()

		context.onDragEnd?.(announce('alpha') as DragEndEvent)

		expect(announcements.onDragEnd(announce('alpha'))).toBeUndefined()
	})

	it('names an unlabeled tile by its id in the announcements', () => {
		const store = makeStore()

		const { context, announcements } = renderDrag(store)

		context.onDragStart?.(start('alpha'))

		expect(announcements.onDragStart(announce('alpha'))).toMatch(/^Picked up alpha at /)
	})

	describe('keyboard coordinates', () => {
		it('gives no step while no drag is live', () => {
			const { context } = renderDrag(makeStore())

			expect(step(coordinateGetterOf(context), 'ArrowRight')).toBeUndefined()
		})

		it('gives no step for a key off the arrows', () => {
			const { context } = renderDrag(makeStore())

			context.onDragStart?.(start('alpha'))

			const getter = coordinateGetterOf(context)

			expect(step(getter, 'Space')).toBeUndefined()

			// A side arrow moves one column of 50 px, and a vertical arrow moves one row.
			expect(step(getter, 'ArrowRight')).toEqual({ x: 50, y: 0 })

			expect(step(getter, 'ArrowUp')).toEqual({ x: 0, y: -50 / ROW_SUBDIVISION })
		})

		it('steps back from the edge of the travel range after an overshoot', () => {
			const { context } = renderDrag(makeStore())

			context.onDragStart?.(start('alpha'))

			// Alpha travels 16 columns, which is 800 px. The delta goes four columns past that edge.
			context.onDragMove?.(move('alpha', 1000))

			const getter = coordinateGetterOf(context)

			const next = getter(new KeyboardEvent('keydown', { code: 'ArrowLeft' }), {
				currentCoordinates: { x: 1000, y: 0 },
			} as unknown as Parameters<KeyboardCoordinateGetter>[1])

			// The first return press moves one column inside the edge.
			expect(next).toEqual({ x: 750, y: 0 })
		})
	})
})
