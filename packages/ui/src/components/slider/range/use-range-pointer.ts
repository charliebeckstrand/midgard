'use client'

import { type PointerEvent, type RefObject, useCallback, useRef, useState } from 'react'
import { isRtl } from '../../../hooks/a11y/logical-arrow'
import { useDragCursorHold } from '../../../hooks/use-drag-cursor'
import { useStableEvent } from '../../../hooks/use-stable-event'
import { clamp } from '../../../utilities'
import { holdTextSelection } from '../../../utilities/hold-text-selection'
import { createPressOwner } from '../../../utilities/primary-press'
import { crossesOtherThumb, snapValue } from './range-utilities'
import type { OverlapMode, ThumbButtonRefs, ThumbIndex } from './types'
import { useRangeUpdate } from './use-range-update'

type ThumbRef = { current: ThumbIndex | null }

/**
 * Resolves which thumb a move drives. Stacked thumbs defer until the first move
 * reveals direction. `inline` is the pointer position on the inline axis, so a
 * larger value is nearer the end of the track in each direction.
 *
 * @returns The thumb now being dragged, or null to keep waiting (no movement
 * yet, or pinned at a boundary).
 * @internal
 */
function resolveDraggingThumb(
	inline: number,
	draggingRef: ThumbRef,
	pendingStackedRef: { current: number | null },
	bounds: { stacked: number; min: number; max: number },
): ThumbIndex | null {
	if (draggingRef.current !== null) return draggingRef.current

	if (pendingStackedRef.current === null) return null

	const dx = inline - pendingStackedRef.current

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
 * writes the snapped value, and capture-end resets the drag. The track mirrors
 * in a right-to-left layout, so the value grows from right to left there.
 *
 * @returns Pointer handlers to spread on the track.
 * @remarks
 * A primary press focuses the button of the thumb it resolves, so the press
 * also sets the keyboard focus (WAI-ARIA slider). A drag that crosses the
 * other thumb in `swap` mode moves the focus with the value to its new slot.
 * `onDragStart` and `onDragEnd` bracket the gesture on the thumb that the
 * press grabbed.
 */
export function useRangePointer(options: {
	min: number
	max: number
	step: number
	disabled: boolean
	/** A read-only press focuses the nearest thumb and starts no drag. */
	readOnly?: boolean
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
		readOnly = false,
		current,
		trackRef,
		setRange,
		overlap,
		thumbRefs,
		onDragStart,
		onDragEnd,
	} = options

	const update = useRangeUpdate({ min, max, step, setRange, overlap })

	const draggingRef = useRef<ThumbIndex | null>(null)
	// Stores the inline position of pointerdown on stacked thumbs until the
	// first move reveals direction, then resolves which thumb to drag.
	const pendingStackedRef = useRef<number | null>(null)

	// Whether the track lays out right to left. The press reads it, and it holds
	// for the whole gesture.
	const rtlRef = useRef(false)

	// The thumb that the press grabbed. It holds for the whole gesture, so the
	// bracket pairs. `draggingRef` follows a swap to the other slot; this ref
	// does not.
	const gestureThumbRef = useRef<ThumbIndex | null>(null)

	// The pointer that drives the drag. A palm that lands mid-drag grabs no thumb.
	const [press] = useState(createPressOwner)

	// The track keeps its cursor on the page while the press holds, off the track too.
	const cursorHold = useDragCursorHold('pointer')

	// The handlers below run from pointer events, not from render. A new
	// callback must not re-arm a gesture that is already in flight.
	const reportDragStart = useStableEvent((thumb: ThumbIndex) => onDragStart?.(thumb))

	const reportDragEnd = useStableEvent((thumb: ThumbIndex) => onDragEnd?.(thumb))

	// One entry point for the four routes that grab a thumb. Every grab reports
	// once, and `endDrag` always has a start to pair with.
	const beginDrag = useCallback(
		(thumb: ThumbIndex) => {
			draggingRef.current = thumb
			gestureThumbRef.current = thumb

			reportDragStart(thumb)
		},
		[reportDragStart],
	)

	// The pointer position on the inline axis: `clientX`, negated in a
	// right-to-left layout. A larger value is nearer the end of the track.
	const inlinePosition = useCallback((clientX: number) => (rtlRef.current ? -clientX : clientX), [])

	const valueFromPointer = useCallback(
		(clientX: number) => {
			const track = trackRef.current

			if (!track) return min

			const rect = track.getBoundingClientRect()

			// In a right-to-left layout the track starts at its right edge.
			const offset = rtlRef.current ? rect.right - clientX : clientX - rect.left

			const ratio = clamp(offset / rect.width, 0, 1)

			return min + ratio * (max - min)
		},
		[min, max, trackRef],
	)

	const closestThumb = useCallback(
		(raw: number): ThumbIndex => {
			const startDistance = Math.abs(raw - current[0])

			const endDistance = Math.abs(raw - current[1])

			// Prefers the higher thumb when equidistant.
			return startDistance < endDistance ? 0 : 1
		},
		[current],
	)

	const onPointerDown = useCallback(
		(event: PointerEvent) => {
			// A context-menu press, a macOS Ctrl-click included, writes no value.
			// A second finger, or a pointer of another type mid-drag, grabs no thumb.
			if (disabled || !press.claim(event)) return

			holdTextSelection(event)

			event.preventDefault()

			rtlRef.current = isRtl(event.currentTarget)

			// A read-only press sets the keyboard focus, as on a live slider. It
			// captures no pointer, so no move or lift reaches the drag.
			if (readOnly) {
				press.release()

				focusThumb(thumbRefs, closestThumb(valueFromPointer(event.clientX)))

				return
			}

			event.currentTarget.setPointerCapture(event.pointerId)

			cursorHold.start()

			const raw = valueFromPointer(event.clientX)

			if (current[0] === current[1]) {
				const snapped = snapValue(raw, min, max, step)

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
				pendingStackedRef.current = inlinePosition(event.clientX)
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
			readOnly,
			press,
			closestThumb,
			update,
			valueFromPointer,
			current,
			min,
			max,
			step,
			thumbRefs,
			beginDrag,
			cursorHold,
			inlinePosition,
		],
	)

	const onPointerMove = useCallback(
		(event: PointerEvent) => {
			if (!press.owns(event)) return

			const wasPending = pendingStackedRef.current !== null

			const dragging = resolveDraggingThumb(
				inlinePosition(event.clientX),
				draggingRef,
				pendingStackedRef,
				{
					stacked: current[0],
					min,
					max,
				},
			)

			if (dragging === null) return

			// The stacked press focused thumb 1 and deferred the drag; the focus
			// follows the thumb the first move resolves. The bracket follows it
			// too, because this move is where the grab becomes real.
			if (wasPending) {
				focusThumb(thumbRefs, dragging)

				// `resolveDraggingThumb` already set `draggingRef`, so `beginDrag`'s
				// write of it is a no-op here. The no-op keeps one entry point.
				beginDrag(dragging)
			}

			const raw = valueFromPointer(event.clientX)

			// `useRangeUpdate` re-sorts a swap, so the drag follows the value to the
			// other slot. The focus follows it too, so an arrow key then drives the
			// thumb that the pointer dragged.
			if (
				overlap === 'swap' &&
				crossesOtherThumb(dragging, snapValue(raw, min, max, step), current)
			) {
				const other: ThumbIndex = dragging === 0 ? 1 : 0

				draggingRef.current = other

				focusThumb(thumbRefs, other)
			}

			// Passes the index active when this move began.
			update(dragging, raw)
		},
		[
			press,
			update,
			valueFromPointer,
			inlinePosition,
			current,
			min,
			max,
			step,
			overlap,
			thumbRefs,
			beginDrag,
		],
	)

	const endDrag = useCallback(
		(event: PointerEvent) => {
			// The release of another pointer does not end the drag.
			if (!press.owns(event)) return

			press.release()

			const grabbed = gestureThumbRef.current

			draggingRef.current = null
			pendingStackedRef.current = null
			gestureThumbRef.current = null

			cursorHold.end()

			// A press on the stack that did not move grabbed no thumb, so it closes no
			// bracket. Every other route latched a thumb and owes one end.
			if (grabbed !== null) reportDragEnd(grabbed)
		},
		[press, reportDragEnd, cursorHold],
	)

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
