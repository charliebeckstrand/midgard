'use client'

import type {
	DndContextProps,
	DragMoveEvent,
	DragStartEvent,
	KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useSortableSensors } from '../../hooks'
import { clamp } from '../../utilities'
import {
	describeDragCancel,
	describeDragEnd,
	describeDragMove,
	describeDragStart,
} from './dashboard-announcements'
import { bottom, type LayoutCell, ROW_SUBDIVISION, sameGeometry } from './dashboard-layout'
import { reorderPreview } from './dashboard-reorder'
import type { DashboardGestureEndEvent, DashboardGestureStartEvent } from './types'

/** Options for {@link useDashboardDrag}. @internal */
type DashboardDragOptions = {
	/** The cells painted at rest — the snapshot source for a new gesture. */
	rendered: LayoutCell[]
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

/** A live drag: the gripped cell and the layout it simulates from. @internal */
type DragState = {
	id: string
	origin: LayoutCell
	snapshot: LayoutCell[]
	/**
	 * The lowest row the tile may reach: the board's own bottom edge less the
	 * tile's height, so its travel stays flush within the occupied rows. A
	 * drag only reorders against another tile, so it never needs to reach open
	 * space — and nothing it does can grow the canvas.
	 */
	maxY: number
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
 * The drag orchestration behind the dashboard canvas. Every move is
 * answered in one frozen reference frame — the drag-start snapshot, in
 * grid units — keyed by the travelling tile's own cell: its origin plus
 * the drag delta, rounded, clamped to the occupied rows exactly as the
 * tile's visual travel is. A drag reorders ({@link reorderPreview}) against
 * an equal-span tile it mostly covers — shifting its row's run open when the
 * partner shares its row, trading places when the partner is on another.
 * Anything else is blocked — the placeholder clears and a drop changes
 * nothing. Only the tiles the reorder names ever move, and nothing grows the
 * canvas. The tile drags itself — no overlay clone — so a drop commits
 * exactly the preview the board shows; Escape reverts outright.
 *
 * @internal
 */
export function useDashboardDrag({
	rendered,
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

	/** The last applied target cell — the quantizer's memory. */
	const targetRef = useRef<{ x: number; y: number } | null>(null)

	/** The current reorder partner and its kind, for the announcement channel. */
	const partnerRef = useRef<{ id: string; shift: boolean } | null>(null)

	const renderedRef = useRef(rendered)

	renderedRef.current = rendered

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

			setDrag({
				id,
				origin,
				snapshot,
				maxY: Math.max(0, bottom(snapshot) - origin.h),
			})

			targetRef.current = null

			partnerRef.current = null

			onDragStart?.({ id, layout: publicLayoutRef.current })
		},
		[onDragStart],
	)

	const handleDragMove = useCallback(
		(event: DragMoveEvent) => {
			const live = dragRef.current

			const pitch = pitchRef.current

			if (live === null || pitch <= 0) return

			// The travelling tile's own cell, not the pointer's: the grip sits in
			// the tile's corner, so a pointer sample would read a cell a whole
			// span away from the one the tile visibly covers.
			const tx = Math.round(
				clamp(live.origin.x + event.delta.x / pitch, 0, columns - live.origin.w),
			)

			const ty = Math.round(
				clamp(live.origin.y + (event.delta.y * ROW_SUBDIVISION) / pitch, 0, live.maxY),
			)

			// Quantized: within one cell nothing changed, so nothing re-simulates.
			const last = targetRef.current

			if (last !== null && last.x === tx && last.y === ty) return

			targetRef.current = { x: tx, y: ty }

			// Blocked targets clear the preview: the placeholder disappears and a
			// pending swap partner returns home, so the board always shows exactly
			// what a drop right now would do — including nothing.
			const next = reorderPreview(live.snapshot, live.id, tx, ty)

			partnerRef.current = next ? { id: next.swapWith, shift: next.shift } : null

			// Only a genuinely different arrangement re-renders: a re-simulation
			// landing where the preview already stands changes nothing on screen.
			setPreview((current) => {
				if (next === null) return null

				const base = current ?? live.snapshot

				return sameGeometry(next.cells, base) ? current : next.cells
			})
		},
		[columns],
	)

	const settle = useCallback(() => {
		setDrag(null)

		setPreview(null)

		targetRef.current = null

		partnerRef.current = null
	}, [])

	const handleDragEnd = useCallback(() => {
		const live = dragRef.current

		if (live === null) return

		const result = previewRef.current

		const changed = result !== null && !sameGeometry(result, live.snapshot)

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

	const announcements = useMemo<NonNullable<DndContextProps['accessibility']>['announcements']>(
		() => ({
			onDragStart: ({ active }) => {
				const cell = placeholder()

				return cell ? describeDragStart(String(active.id), cell, columns) : undefined
			},
			onDragOver: ({ active }) => {
				const cell = placeholder()

				return cell
					? describeDragMove(String(active.id), cell, columns, partnerRef.current ?? undefined)
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
			// No droppables, no overlay, no modifiers: the tile drags itself and
			// clamps its own transform to the canvas as it paints, and the
			// classifier reads the snapshot, never the DOM — so dnd-kit carries
			// only the sensors, the pointer transform, and the announcement channel.
			accessibility: { announcements },
			onDragStart: handleDragStart,
			onDragMove: handleDragMove,
			onDragEnd: handleDragEnd,
			onDragCancel: handleDragCancel,
		}),
		[sensors, announcements, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel],
	)

	return { dndContextProps, activeId: drag?.id ?? null, preview }
}
