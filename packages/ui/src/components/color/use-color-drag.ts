'use client'

import {
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useRef,
} from 'react'
import { type DragCursor, useDragCursorHold } from '../../hooks/use-drag-cursor'
import { clamp } from '../../utilities'
import { isPrimaryPress } from '../../utilities/primary-press'

/** Pointer position within the tracked element, each axis normalized to `0-1`. */
export type DragPosition = { x: number; y: number }

/** Pointer-event bindings for a draggable track; spread onto the tracked element. */
export type ColorDragHandlers = {
	/**
	 * Cancels the mousedown of a press, so the press does not move the focus that
	 * the drag gives. Only a drag surface holds the press. Each other part of a
	 * panel takes the focus of a press, as a native control does.
	 */
	onMouseDown: (event: ReactMouseEvent<HTMLElement>) => void
	onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
	onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
	onLostPointerCapture: () => void
}

/**
 * Whether a disabled ancestor `<fieldset>` disables `element`, by the rule that
 * disables a native control. A control in the first `<legend>` of the fieldset
 * stays enabled.
 *
 * @remarks
 * A `<div>` does not match `:disabled`, so a track or the area reads its
 * fieldsets when an event occurs. The check keeps no state, so the tab stop
 * does not change.
 * @internal
 */
export function inDisabledFieldset(element: Element): boolean {
	for (
		let fieldset = element.closest('fieldset');
		fieldset;
		fieldset = fieldset.parentElement?.closest('fieldset') ?? null
	) {
		if (fieldset.disabled && !fieldset.querySelector(':scope > legend')?.contains(element)) {
			return true
		}
	}

	return false
}

/** The `onMouseDown` of {@link ColorDragHandlers}. @internal */
function holdPress(event: ReactMouseEvent<HTMLElement>): void {
	event.preventDefault()
}

/**
 * Translates pointer drags over `ref` into normalized `0-1` positions.
 * Captures the pointer on press; drags that leave the element keep tracking.
 * Press also focuses the element, handing off to keyboard control.
 * Shared by the 2D saturation/value area and the 1D hue/alpha tracks.
 *
 * @param ref - The tracked element; its bounding rect normalizes pointer coordinates.
 * @param onPosition - Receives the clamped `0-1` position on press and on each tracked move.
 * @param disabled - When set, press is ignored and no drag begins. A disabled
 *   ancestor `<fieldset>` has the same effect (see {@link inDisabledFieldset}).
 * @param cursor - The cursor of the track at rest, which the page holds while the press holds.
 * @returns The {@link ColorDragHandlers} bag to spread onto `ref`'s element.
 * @remarks
 * `onPointerDown` calls `preventDefault` and focuses `ref` synchronously, so the
 * primary-button press doubles as the keyboard-focus path (WAI-ARIA slider). It
 * fires `onPosition` immediately on press, before any move. `preventScroll` stops
 * a scroll into view. A scroll moves the rect of `ref` below the pointer, so the
 * press position is off by the scroll distance. Tracking persists
 * past the element's bounds via pointer capture; `lostpointercapture` is the
 * authoritative reset, covering normal release, browser-claimed gestures
 * (`pointercancel`), and node removal mid-drag. Non-primary buttons are ignored.
 * @internal
 */
export function useColorDrag(
	ref: RefObject<HTMLElement | null>,
	onPosition: (position: DragPosition) => void,
	disabled: boolean,
	cursor: DragCursor,
): ColorDragHandlers {
	const dragging = useRef(false)

	const cursorHold = useDragCursorHold(cursor)

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
			if (disabled || !isPrimaryPress(event) || inDisabledFieldset(event.currentTarget)) return

			event.preventDefault()

			ref.current?.focus({ preventScroll: true })
			event.currentTarget.setPointerCapture(event.pointerId)

			dragging.current = true

			cursorHold.start()

			onPosition(positionFromEvent(event))
		},
		[disabled, onPosition, positionFromEvent, ref, cursorHold],
	)

	const onPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			if (!dragging.current) return

			onPosition(positionFromEvent(event))
		},
		[onPosition, positionFromEvent],
	)

	const endDrag = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			dragging.current = false

			cursorHold.end()

			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId)
			}
		},
		[cursorHold],
	)

	// `lostpointercapture` fires on every capture end: normal release,
	// `pointercancel` (browser-claimed gesture), or node removal. It is the
	// authoritative reset for `dragging`.
	const onLostPointerCapture = useCallback(() => {
		dragging.current = false

		cursorHold.end()
	}, [cursorHold])

	return {
		onMouseDown: holdPress,
		onPointerDown,
		onPointerMove,
		onPointerUp: endDrag,
		onPointerCancel: endDrag,
		onLostPointerCapture,
	}
}
