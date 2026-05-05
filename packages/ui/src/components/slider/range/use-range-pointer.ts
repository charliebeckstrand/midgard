import { type PointerEvent, type RefObject, useCallback, useRef } from 'react'
import { type OverlapMode, type ThumbIndex, useRangeUpdate } from './use-range-update'
import { clamp, snapToStep } from './utilities'

export function useRangePointer(opts: {
	min: number
	max: number
	step: number
	disabled: boolean
	current: [number, number]
	trackRef: RefObject<HTMLDivElement | null>
	setRange: (fn: (prev: [number, number] | undefined) => [number, number]) => void
	overlap: OverlapMode
}) {
	const { min, max, step, disabled, current, trackRef, setRange, overlap } = opts

	const update = useRangeUpdate({ min, max, step, setRange, overlap })

	const draggingRef = useRef<ThumbIndex | null>(null)
	// When pointer goes down on stacked thumbs, defer thumb selection until the
	// first move reveals direction. Stores the clientX of pointerdown.
	const pendingStackedRef = useRef<number | null>(null)

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
		(clientX: number): ThumbIndex => {
			const raw = valueFromPointer(clientX)

			const d0 = Math.abs(raw - current[0])

			const d1 = Math.abs(raw - current[1])

			// Prefer the higher thumb when equidistant so the lower handle isn't trapped
			return d0 < d1 ? 0 : 1
		},
		[valueFromPointer, current],
	)

	const onPointerDown = useCallback(
		(event: PointerEvent) => {
			if (disabled) return

			event.preventDefault()

			const target = event.currentTarget as HTMLElement
			target.setPointerCapture(event.pointerId)

			const raw = valueFromPointer(event.clientX)

			if (current[0] === current[1]) {
				const snapped = snapToStep(clamp(raw, min, max), min, step)

				// Pointer landed off the stack — pick the thumb on that side and jump it.
				if (snapped < current[0]) {
					draggingRef.current = 0
					update(0, raw)
					return
				}

				if (snapped > current[0]) {
					draggingRef.current = 1
					update(1, raw)
					return
				}

				// Pointer landed on the stack — defer until the first move shows direction.
				pendingStackedRef.current = event.clientX
				return
			}

			const thumb = closestThumb(event.clientX)
			draggingRef.current = thumb
			update(thumb, raw)
		},
		[disabled, closestThumb, update, valueFromPointer, current, min, max, step],
	)

	const onPointerMove = useCallback(
		(event: PointerEvent) => {
			if (draggingRef.current === null) {
				if (pendingStackedRef.current === null) return

				const dx = event.clientX - pendingStackedRef.current
				if (dx === 0) return

				// At the min/max boundary, the matching thumb has nowhere to go.
				// Keep waiting in case the user reverses direction.
				const stacked = current[0]
				if (dx < 0 && stacked <= min) return
				if (dx > 0 && stacked >= max) return

				draggingRef.current = dx < 0 ? 0 : 1
				pendingStackedRef.current = null
			}

			const raw = valueFromPointer(event.clientX)
			const dragging = draggingRef.current

			// Always pass the index that was active when this move began. useRangeUpdate
			// rewrites that slot then re-sorts when overlap='swap', which preserves the
			// non-dragged thumb's value. After the update, point draggingRef at the new
			// slot of the value we just wrote so subsequent moves track the same finger.
			if (overlap === 'swap') {
				const snapped = snapToStep(clamp(raw, min, max), min, step)

				if (dragging === 0 && snapped > current[1]) draggingRef.current = 1
				else if (dragging === 1 && snapped < current[0]) draggingRef.current = 0
			}

			update(dragging, raw)
		},
		[update, valueFromPointer, current, min, max, step, overlap],
	)

	const onPointerUp = useCallback(() => {
		draggingRef.current = null
		pendingStackedRef.current = null
	}, [])

	return { onPointerDown, onPointerMove, onPointerUp }
}
