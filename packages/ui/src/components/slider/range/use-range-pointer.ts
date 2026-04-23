import { type PointerEvent, type RefObject, useCallback, useRef } from 'react'
import { type ThumbIndex, useRangeUpdate } from './use-range-update'
import { clamp } from './utilities'

export function useRangePointer(opts: {
	min: number
	max: number
	step: number
	disabled: boolean
	current: [number, number]
	trackRef: RefObject<HTMLDivElement | null>
	setRange: (fn: (prev: [number, number] | undefined) => [number, number]) => void
}) {
	const { min, max, step, disabled, current, trackRef, setRange } = opts

	const update = useRangeUpdate({ min, max, step, setRange })

	const draggingRef = useRef<ThumbIndex | null>(null)

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

			const thumb = closestThumb(event.clientX)

			draggingRef.current = thumb

			update(thumb, valueFromPointer(event.clientX))

			const target = event.currentTarget as HTMLElement

			target.setPointerCapture(event.pointerId)
		},
		[disabled, closestThumb, update, valueFromPointer],
	)

	const onPointerMove = useCallback(
		(event: PointerEvent) => {
			if (draggingRef.current === null) return

			update(draggingRef.current, valueFromPointer(event.clientX))
		},
		[update, valueFromPointer],
	)

	const onPointerUp = useCallback(() => {
		draggingRef.current = null
	}, [])

	return { onPointerDown, onPointerMove, onPointerUp }
}
