'use client'

import { type PointerEvent as ReactPointerEvent, type RefObject, useCallback, useRef } from 'react'
import { clamp } from '../../utilities'

/** Pointer position within the tracked element, each axis normalised to `0–1`. */
export type DragPosition = { x: number; y: number }

export type ColorDragHandlers = {
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
	onLostPointerCapture: () => void
}

/**
 * Translate pointer drags over `ref` into normalised `0–1` positions. Captures
 * the pointer on press so a drag that leaves the element keeps tracking, and
 * focuses the element so keyboard control picks up where the pointer left off.
 * Shared by the 2D saturation/value area and the 1D hue/alpha tracks.
 */
export function useColorDrag(
	ref: RefObject<HTMLElement | null>,
	onPosition: (position: DragPosition) => void,
	disabled: boolean,
): ColorDragHandlers {
	const dragging = useRef(false)

	const positionFromEvent = useCallback(
		(event: ReactPointerEvent<HTMLElement>): DragPosition => {
			const rect = ref.current?.getBoundingClientRect()

			if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }

			return {
				x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
				y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
			}
		},
		[ref],
	)

	const onPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			if (disabled || event.button !== 0) return

			event.preventDefault()

			ref.current?.focus()
			event.currentTarget.setPointerCapture(event.pointerId)

			dragging.current = true

			onPosition(positionFromEvent(event))
		},
		[disabled, onPosition, positionFromEvent, ref],
	)

	const onPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			if (!dragging.current) return

			onPosition(positionFromEvent(event))
		},
		[onPosition, positionFromEvent],
	)

	const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
		dragging.current = false

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId)
		}
	}, [])

	// `lostpointercapture` is the one signal guaranteed to fire whenever capture
	// ends — a normal release, a `pointercancel` (browser-claimed gesture), or the
	// node being torn out — so it's the authoritative reset. Without it a cancelled
	// drag never clears `dragging`, and the handle keeps tracking the pointer until
	// the next click lands a `pointerup`.
	const onLostPointerCapture = useCallback(() => {
		dragging.current = false
	}, [])

	return {
		onPointerDown,
		onPointerMove,
		onPointerUp: endDrag,
		onPointerCancel: endDrag,
		onLostPointerCapture,
	}
}
