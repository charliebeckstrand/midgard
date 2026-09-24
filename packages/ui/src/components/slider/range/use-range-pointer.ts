'use client'

import { type PointerEvent, type RefObject, useCallback, useEffectEvent, useRef } from 'react'
import { clamp } from '../../../utilities'
import { snapToStep } from './range-utilities'
import type { OverlapMode, ThumbButtonRefs, ThumbIndex } from './types'
import { useRangeUpdate } from './use-range-update'

type ThumbRef = { current: ThumbIndex | null }

/**
 * Resolves which thumb a move drives. Stacked thumbs defer until the first move
 * reveals direction.
 *
 * @returns The thumb now being dragged, or null to keep waiting (no movement
 * yet, or pinned at a boundary).
 * @internal
 */
function resolveDraggingThumb(
	clientX: number,
	draggingRef: ThumbRef,
	pendingStackedRef: { current: number | null },
	bounds: { stacked: number; min: number; max: number },
): ThumbIndex | null {
	if (draggingRef.current !== null) return draggingRef.current

	if (pendingStackedRef.current === null) return null

	const dx = clientX - pendingStackedRef.current

	if (dx === 0) return null

	// At the min/max boundary the matching thumb has nowhere to go; keep
	// waiting for a direction reversal.
	if (dx < 0 && bounds.stacked <= bounds.min) return null

	if (dx > 0 && bounds.stacked >= bounds.max) return null

	const thumb: ThumbIndex = dx < 0 ? 0 : 1

	draggingRef.current = thumb

	pendingStackedRef.current = null

	return thumb
}

/**
 * After `useRangeUpdate` re-sorts on swap, follows `draggingRef` to the new
 * slot of the written value.
 *
 * @internal
 */
function applySwapResort(
	dragging: ThumbIndex,
	snapped: number,
	current: [number, number],
	draggingRef: ThumbRef,
): void {
	if (dragging === 0 && snapped > current[1]) draggingRef.current = 1
	else if (dragging === 1 && snapped < current[0]) draggingRef.current = 0
}

/**
 * Moves DOM focus to a thumb button.
 *
 * @remarks
 * `preventScroll` stops a scroll into view. A scroll moves the track rectangle
 * below the captured pointer, and the next move makes the value jump.
 * @internal
 */
function focusThumb(thumbRefs: ThumbButtonRefs, thumb: ThumbIndex): void {
	thumbRefs[thumb].current?.focus({ preventScroll: true })
}

/**
 * Pointer control for a range slider's two thumbs. Pointerdown grabs the
 * closest thumb, or on a stack defers to the first move's direction. A drag
 * writes the snapped value, and capture-end resets the drag.
 *
 * @returns Pointer handlers to spread on the track.
 * @remarks
 * A primary press focuses the button of the thumb it resolves, so the press
 * also sets the keyboard focus (WAI-ARIA slider). `onDragStart` and `onDragEnd`
 * bracket the gesture on the thumb that the press grabbed.
 */
export function useRangePointer(opts: {
	min: number
	max: number
	step: number
	disabled: boolean
	current: [number, number]
	trackRef: RefObject<HTMLDivElement | null>
	setRange: (fn: (prev: [number, number] | undefined) => [number, number]) => void
	overlap: OverlapMode
	thumbRefs: ThumbButtonRefs
	onDragStart?: (thumb: ThumbIndex) => void
	onDragEnd?: (thumb: ThumbIndex) => void
}) {
	const {
		min,
		max,
		step,
		disabled,
		current,
		trackRef,
		setRange,
		overlap,
		thumbRefs,
		onDragStart,
		onDragEnd,
	} = opts

	const update = useRangeUpdate({ min, max, step, setRange, overlap })

	const draggingRef = useRef<ThumbIndex | null>(null)
	// Stores the clientX of pointerdown on stacked thumbs until the first
	// move reveals direction, then resolves which thumb to drag.
	const pendingStackedRef = useRef<number | null>(null)

	// The thumb that the press grabbed. It holds for the whole gesture, so the
	// bracket pairs. `draggingRef` follows a swap to the other slot; this ref
	// does not.
	const gestureThumbRef = useRef<ThumbIndex | null>(null)

	// The handlers below run from pointer events, not from render. A new
	// callback must not re-arm a gesture that is already in flight.
	const reportDragStart = useEffectEvent((thumb: ThumbIndex) => onDragStart?.(thumb))

	const reportDragEnd = useEffectEvent((thumb: ThumbIndex) => onDragEnd?.(thumb))

	// One entry point for the four routes that grab a thumb. Every grab reports
	// once, and `endDrag` always has a start to pair with.
	const beginDrag = useCallback((thumb: ThumbIndex) => {
		draggingRef.current = thumb
		gestureThumbRef.current = thumb

		reportDragStart(thumb)
	}, [])

	const valueFromPointer = useCallback(
		(clientX: number) => {
			const track = trackRef.current

			if (!track) return min

			const rect = track.getBoundingClientRect()

			const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)

			return min + ratio * (max - min)
		},
		[min, max, trackRef],
	)

	const closestThumb = useCallback(
		(raw: number): ThumbIndex => {
			const d0 = Math.abs(raw - current[0])

			const d1 = Math.abs(raw - current[1])

			// Prefers the higher thumb when equidistant.
			return d0 < d1 ? 0 : 1
		},
		[current],
	)

	const onPointerDown = useCallback(
		(event: PointerEvent) => {
			// A context-menu press must write no value; `use-color-drag.ts`
			// guards the same way.
			if (disabled || event.button !== 0) return

			event.preventDefault()

			event.currentTarget.setPointerCapture(event.pointerId)

			const raw = valueFromPointer(event.clientX)

			if (current[0] === current[1]) {
				const snapped = snapToStep(clamp(raw, min, max), min, step)

				// Pointer off the stack: pick the thumb on that side and jump it.
				if (snapped < current[0]) {
					beginDrag(0)
					focusThumb(thumbRefs, 0)
					update(0, raw)

					return
				}

				if (snapped > current[0]) {
					beginDrag(1)
					focusThumb(thumbRefs, 1)
					update(1, raw)

					return
				}

				// Pointer on the stack: defer until the first move shows direction.
				// Thumb 1 matches `closestThumb`'s equidistant tie-break, and keeps
				// a press with no move keyboard-operable.
				pendingStackedRef.current = event.clientX
				focusThumb(thumbRefs, 1)

				return
			}

			const thumb = closestThumb(raw)
			beginDrag(thumb)
			focusThumb(thumbRefs, thumb)
			update(thumb, raw)
		},
		[
			disabled,
			closestThumb,
			update,
			valueFromPointer,
			current,
			min,
			max,
			step,
			thumbRefs,
			beginDrag,
		],
	)

	const onPointerMove = useCallback(
		(event: PointerEvent) => {
			const wasPending = pendingStackedRef.current !== null

			const dragging = resolveDraggingThumb(event.clientX, draggingRef, pendingStackedRef, {
				stacked: current[0],
				min,
				max,
			})

			if (dragging === null) return

			// The stacked press focused thumb 1 and deferred the drag; the focus
			// follows the thumb the first move resolves. The bracket follows it
			// too, because this move is where the grab becomes real.
			if (wasPending) {
				focusThumb(thumbRefs, dragging)

				// `resolveDraggingThumb` already set `draggingRef`, so `beginDrag`'s
				// write of it is a no-op here — worth it to keep one entry point.
				beginDrag(dragging)
			}

			const raw = valueFromPointer(event.clientX)

			// Passes the index active when this move began.
			if (overlap === 'swap') {
				const snapped = snapToStep(clamp(raw, min, max), min, step)

				applySwapResort(dragging, snapped, current, draggingRef)
			}

			update(dragging, raw)
		},
		[update, valueFromPointer, current, min, max, step, overlap, thumbRefs, beginDrag],
	)

	const endDrag = useCallback(() => {
		const grabbed = gestureThumbRef.current

		draggingRef.current = null
		pendingStackedRef.current = null
		gestureThumbRef.current = null

		// A press on the stack that did not move grabbed no thumb, so it closes no
		// bracket. Every other route latched a thumb and owes one end.
		if (grabbed !== null) reportDragEnd(grabbed)
	}, [])

	// `lostpointercapture` fires on every capture end: normal release,
	// `pointercancel` (browser-claimed gesture), or node removal. It is the
	// authoritative reset, mirroring `use-color-drag.ts`.
	return {
		onPointerDown,
		onPointerMove,
		onPointerUp: endDrag,
		onPointerCancel: endDrag,
		onLostPointerCapture: endDrag,
	}
}
