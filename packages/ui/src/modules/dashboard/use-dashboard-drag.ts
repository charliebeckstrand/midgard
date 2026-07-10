'use client'

import type {
	DndContextProps,
	DragMoveEvent,
	DragStartEvent,
	KeyboardCoordinateGetter,
	Modifier,
} from '@dnd-kit/core'
import { getEventCoordinates } from '@dnd-kit/utilities'
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react'
import { useSortableSensors } from '../../hooks'
import { clamp } from '../../utilities'
import {
	describeDragCancel,
	describeDragEnd,
	describeDragMove,
	describeDragStart,
} from './dashboard-announcements'
import { type IntentTracker, trackIntent } from './dashboard-intent'
import {
	compactUp,
	type LayoutCell,
	moveElement,
	ROW_SUBDIVISION,
	sameGeometry,
	swapCells,
} from './dashboard-layout'
import type { DashboardGestureEndEvent, DashboardGestureStartEvent } from './types'

/** Options for {@link useDashboardDrag}. @internal */
type DashboardDragOptions = {
	/** The grid canvas element, for container-relative pointer math. */
	containerRef: RefObject<HTMLDivElement | null>
	/** The cells painted at rest — the snapshot source for a new gesture. */
	rendered: LayoutCell[]
	/** Live gate: gestures only commit while the rendered layout is canonical. */
	identity: boolean
	/** The grid's column count. */
	columns: number
	/** Measured column pitch in px; `0` disables cell math (and gestures with it). */
	columnPitch: number
	/** Commits a preview as the canonical layout; returns the emitted items. */
	commit: (cells: readonly LayoutCell[]) => DashboardGestureEndEvent['layout']
	/** The canonical layout in public shape, for the event payloads. */
	publicLayout: DashboardGestureStartEvent['layout']
	onDragStart?: (event: DashboardGestureStartEvent) => void
	onDragEnd?: (event: DashboardGestureEndEvent) => void
}

/** A live drag: the gripped cell, the layout it simulates from, and the pointer anchor. @internal */
type DragState = {
	id: string
	origin: LayoutCell
	snapshot: LayoutCell[]
	/** The activating pointer's page coordinates, or `null` for a keyboard drag. */
	pointerStart: { x: number; y: number } | null
}

/** What {@link useDashboardDrag} returns. @internal */
type DashboardDragState = {
	/** Sensors, announcements, and handlers for `DndContext`. */
	dndContextProps: DndContextProps
	/** The dragged tile's id, or `null` at rest. */
	activeId: string | null
	/** The live preview layout, or `null` at rest — paint this over `rendered` while set. */
	preview: LayoutCell[] | null
}

/**
 * The snapshot cell under a point, in grid units — the classifier's whole
 * notion of "hovered". Reading the frozen snapshot rather than live rects
 * is what makes the drag stable: the preview can reflow tiles all it wants
 * without ever re-answering where the pointer is.
 *
 * @internal
 */
function snapshotCellAt(
	snapshot: readonly LayoutCell[],
	selfId: string,
	column: number,
	row: number,
): LayoutCell | undefined {
	return snapshot.find(
		(cell) =>
			cell.id !== selfId &&
			!cell.static &&
			column >= cell.x &&
			column < cell.x + cell.w &&
			row >= cell.y &&
			row < cell.y + cell.h,
	)
}

/**
 * The layout a committed intent previews: origins swap on the middle band;
 * the edge bands move the dragged cell onto the hovered cell's top edge (or
 * past its bottom), opening the gap there. Always simulated from the
 * snapshot and compacted, so the preview is gap-free and drop-exact.
 *
 * @internal
 */
function intentPreview(
	live: DragState,
	overId: string,
	zone: 'above' | 'swap' | 'below',
	columns: number,
): LayoutCell[] | null {
	if (zone === 'swap') return compactUp(swapCells(live.snapshot, live.id, overId))

	const over = live.snapshot.find((cell) => cell.id === overId)

	if (over === undefined) return null

	const toY = zone === 'above' ? over.y : over.y + over.h

	// Hop-free: an explicit insert moves the hovered tile softly out of the
	// way, one row at a time, never leapfrogging it past the drop.
	return compactUp(moveElement(live.snapshot, live.id, over.x, toY, columns, { hop: false }))
}

/**
 * The layout a free move previews: the dragged cell lands `delta` away from
 * its origin, rounded to whole cells, and the displacement engine resolves
 * whatever it lands on. Pure in the drag's start values and the pointer
 * delta — no rect is ever read.
 *
 * @internal
 */
function deltaPreview(
	live: DragState,
	delta: { x: number; y: number },
	columnPitch: number,
	columns: number,
): LayoutCell[] {
	const toX = clamp(live.origin.x + Math.round(delta.x / columnPitch), 0, columns - live.origin.w)

	const toY = Math.max(0, live.origin.y + Math.round(delta.y / (columnPitch / ROW_SUBDIVISION)))

	return compactUp(moveElement(live.snapshot, live.id, toX, toY, columns))
}

/**
 * The drag orchestration behind the dashboard grid. Every sample is
 * answered in one frozen reference frame — the drag-start snapshot, in
 * grid units — so the preview's own reflow can never feed back into the
 * classification, and simulating from that same snapshot means dragging
 * away restores what a pass-through displaced and Escape reverts for free.
 * Over a snapshot cell, the pointer's band picks the meaning (swap on the
 * middle, insert above or below on the edges), every change debounced by
 * the intent tracker's dwell; over open grid, the tile lands a whole-cell
 * delta from its origin. A preview whose geometry matches the current one
 * is skipped outright, so tiles only ever move when the answer truly
 * changed.
 *
 * @internal
 */
export function useDashboardDrag({
	containerRef,
	rendered,
	identity,
	columns,
	columnPitch,
	commit,
	publicLayout,
	onDragStart,
	onDragEnd,
}: DashboardDragOptions): DashboardDragState {
	const [drag, setDrag] = useState<DragState | null>(null)

	const [preview, setPreview] = useState<LayoutCell[] | null>(null)

	// Refs mirror the state the dnd-kit callbacks and announcement builders
	// read, so their identities never churn the context they configure.
	const dragRef = useRef(drag)

	dragRef.current = drag

	const previewRef = useRef(preview)

	previewRef.current = preview

	const intentRef = useRef<IntentTracker | null>(null)

	const renderedRef = useRef(rendered)

	renderedRef.current = rendered

	const identityRef = useRef(identity)

	identityRef.current = identity

	const pitchRef = useRef(columnPitch)

	pitchRef.current = columnPitch

	const publicLayoutRef = useRef(publicLayout)

	publicLayoutRef.current = publicLayout

	/** The dragged cell's position in the current preview, for announcements. */
	const placeholder = useCallback((): LayoutCell | null => {
		const live = dragRef.current

		if (live === null) return null

		return (previewRef.current ?? live.snapshot).find((cell) => cell.id === live.id) ?? null
	}, [])

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const id = String(event.active.id)

			const snapshot = renderedRef.current

			const origin = snapshot.find((cell) => cell.id === id)

			if (origin === undefined) return

			const coordinates = event.activatorEvent ? getEventCoordinates(event.activatorEvent) : null

			setDrag({ id, origin, snapshot, pointerStart: coordinates ?? null })

			intentRef.current = null

			onDragStart?.({ id, layout: publicLayoutRef.current })
		},
		[onDragStart],
	)

	const handleDragMove = useCallback(
		(event: DragMoveEvent) => {
			const live = dragRef.current

			const container = containerRef.current

			const pitch = pitchRef.current

			if (live === null || container === null || pitch <= 0) return

			// Classify the pointer against the frozen snapshot, in grid units.
			// A keyboard drag has no pointer and always takes the delta path.
			let overId: string | null = null

			let relativeY = 0

			if (live.pointerStart !== null) {
				const rect = container.getBoundingClientRect()

				const column = (live.pointerStart.x + event.delta.x - rect.left) / pitch

				const row = (live.pointerStart.y + event.delta.y - rect.top) / (pitch / ROW_SUBDIVISION)

				const over = snapshotCellAt(live.snapshot, live.id, column, row)

				if (over !== undefined) {
					overId = over.id

					relativeY = (row - over.y) / over.h
				}
			}

			const tracker = trackIntent(intentRef.current, overId, relativeY, performance.now())

			intentRef.current = tracker

			const next =
				(tracker.committed !== null
					? intentPreview(live, tracker.committed.overId, tracker.committed.zone, columns)
					: null) ?? deltaPreview(live, event.delta, pitch, columns)

			// Only a genuinely different arrangement re-renders: the placeholder
			// hopping within one resting spot, or a re-simulation landing where the
			// preview already stands, changes nothing on screen.
			setPreview((current) => {
				const base = current ?? live.snapshot

				return sameGeometry(next, base) ? current : next
			})
		},
		[containerRef, columns],
	)

	const settle = useCallback(() => {
		setDrag(null)

		setPreview(null)

		intentRef.current = null
	}, [])

	const handleDragEnd = useCallback(() => {
		const live = dragRef.current

		if (live === null) return

		const result = previewRef.current

		// A downgrade mid-gesture invalidates the geometry the drag was computed
		// against, so the drop reverts like an Escape.
		const changed = result !== null && identityRef.current && !sameGeometry(result, live.snapshot)

		if (changed) {
			const layout = commit(result)

			onDragEnd?.({ id: live.id, canceled: false, layout })
		} else {
			onDragEnd?.({ id: live.id, canceled: true, layout: publicLayoutRef.current })
		}

		settle()
	}, [commit, onDragEnd, settle])

	const handleDragCancel = useCallback(() => {
		const live = dragRef.current

		if (live === null) return

		onDragEnd?.({ id: live.id, canceled: true, layout: publicLayoutRef.current })

		settle()
	}, [onDragEnd, settle])

	// One arrow press moves one grid cell, not dnd-kit's 25px default.
	const coordinateGetter = useCallback<KeyboardCoordinateGetter>(
		(event, { currentCoordinates }) => {
			const pitch = pitchRef.current

			if (pitch <= 0) return undefined

			const rowPitch = pitch / ROW_SUBDIVISION

			switch (event.code) {
				case 'ArrowRight':
					return { ...currentCoordinates, x: currentCoordinates.x + pitch }

				case 'ArrowLeft':
					return { ...currentCoordinates, x: currentCoordinates.x - pitch }

				case 'ArrowDown':
					return { ...currentCoordinates, y: currentCoordinates.y + rowPitch }

				case 'ArrowUp':
					return { ...currentCoordinates, y: currentCoordinates.y - rowPitch }

				default:
					return undefined
			}
		},
		[],
	)

	const sensors = useSortableSensors({
		activationDistance: 3,
		keyboardCoordinateGetter: coordinateGetter,
	})

	// The travelling clone moves in whole cells, not free pixels: its snapped
	// position is the same rounded delta the drop settles on, so what you see
	// mid-drag is exactly where the tile lands.
	const snapToCells = useCallback<Modifier>(({ transform }) => {
		const pitch = pitchRef.current

		if (pitch <= 0) return transform

		const rowPitch = pitch / ROW_SUBDIVISION

		return {
			...transform,
			x: Math.round(transform.x / pitch) * pitch,
			y: Math.round(transform.y / rowPitch) * rowPitch,
		}
	}, [])

	const announcements = useMemo<NonNullable<DndContextProps['accessibility']>['announcements']>(
		() => ({
			onDragStart: ({ active }) => {
				const cell = placeholder()

				return cell ? describeDragStart(String(active.id), cell, columns) : undefined
			},
			onDragOver: ({ active }) => {
				const cell = placeholder()

				const intent = intentRef.current?.committed ?? null

				return cell
					? describeDragMove(String(active.id), cell, columns, intent ?? undefined)
					: undefined
			},
			onDragEnd: ({ active }) => {
				const cell = placeholder()

				return cell ? describeDragEnd(String(active.id), cell, columns) : undefined
			},
			onDragCancel: ({ active }) => {
				const origin = dragRef.current?.origin

				return origin ? describeDragCancel(String(active.id), origin, columns) : undefined
			},
		}),
		[placeholder, columns],
	)

	const dndContextProps = useMemo<DndContextProps>(
		() => ({
			sensors,
			modifiers: [snapToCells],
			// No droppables exist: the classifier reads the snapshot, never the
			// DOM, so dnd-kit carries only the sensors, the overlay, and the
			// announcement channel.
			accessibility: { announcements },
			onDragStart: handleDragStart,
			onDragMove: handleDragMove,
			onDragEnd: handleDragEnd,
			onDragCancel: handleDragCancel,
		}),
		[
			sensors,
			snapToCells,
			announcements,
			handleDragStart,
			handleDragMove,
			handleDragEnd,
			handleDragCancel,
		],
	)

	return { dndContextProps, activeId: drag?.id ?? null, preview }
}
