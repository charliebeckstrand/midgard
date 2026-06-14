'use client'

import { type PointerEvent as ReactPointerEvent, type RefObject, useCallback, useRef } from 'react'
import { clamp } from '../../utilities'

/** Pointer position within the tracked element, each axis normalised to `0-1`. */
export type DragPosition = { x: number; y: number }

/** Pointer-event bindings for a draggable track; spread onto the tracked element. */
export type ColorDragHandlers = {
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
	onLostPointerCapture: () => void
}

/**
 * Translates pointer drags over `ref` into normalised `0-1` positions.
 * Captures the pointer on press; drags that leave the element keep tracking.
 * Press also focuses the element, handing off to keyboard control.
 * Shared by the 2D saturation/value area and the 1D hue/alpha tracks.
 *
 * @param ref - The tracked element; its bounding rect normalises pointer coordinates.
 * @param onPosition - Receives the clamped `0-1` position on press and on each tracked move.
 * @param disabled - When set, press is ignored and no drag begins.
 * @returns The {@link ColorDragHandlers} bag to spread onto `ref`'s element.
 * @remarks
 * `onPointerDown` calls `preventDefault` and focuses `ref` synchronously, so the
 * primary-button press doubles as the keyboard-focus path (WAI-ARIA slider). It
 * fires `onPosition` immediately on press, before any move. Tracking persists
 * past the element's bounds via pointer capture; `lostpointercapture` is the
 * authoritative reset, covering normal release, browser-claimed gestures
 * (`pointercancel`), and node removal mid-drag. Non-primary buttons are ignored.
 * @internal
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

	// `lostpointercapture` fires on every capture end: normal release,
	// `pointercancel` (browser-claimed gesture), or node removal. It is the
	// authoritative reset for `dragging`.
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
