'use client'

import { type PointerEvent, type RefObject, useEffect, useRef, useState } from 'react'
import { holdDragCursor } from '../../hooks/use-drag-cursor'
import { Shell } from '../../providers/headless/shell'
import type { Orientation } from '../../types'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { createPressOwner } from '../../utilities/primary-press'

/** Props for {@link TextareaGrip}. @internal */
type TextareaGripProps = {
	/** The field that the drag resizes. */
	field: RefObject<HTMLTextAreaElement | null>
	/** The axis of the drag: `vertical` sets the height, and `horizontal` sets the width. */
	axis: Orientation
	className: string
}

/**
 * The touch grip of a Textarea with `resize`. A drag on the grip sets the
 * inline height or width of the field, as a drag on the native grip does.
 *
 * @remarks Safari on iOS and iPadOS draws no native grip, so the CSS `resize`
 * of the field has no effect there. Each browser on iOS uses WebKit. The kata
 * shows this grip only where the primary pointer is coarse, and there it
 * removes the native grip. The `min-height` of the field still applies.
 *
 * The grip is `aria-hidden`, because it is a pointer target only, as the
 * native grip is. Under headless context, it does not render.
 *
 * @internal
 */
export function TextareaGrip({ field, axis, className }: TextareaGripProps) {
	// The pointer that drives the drag. A palm that touches the grip mid-drag
	// does not start a second drag.
	const [press] = useState(createPressOwner)

	// Ends the live drag. A grip that unmounts mid-drag ends it through this ref.
	const live = useRef<AbortController | null>(null)

	useEffect(
		() => () => {
			live.current?.abort()

			press.release()
		},
		[press],
	)

	const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
		const textarea = field.current

		if (!textarea || !press.claim(event)) return

		holdTextSelection(event)

		event.preventDefault()

		const grip = event.currentTarget

		const vertical = axis === 'vertical'

		// The end edge of a right-to-left field is its left edge, so a travel to the
		// left widens the field.
		const sign = vertical || getComputedStyle(textarea).direction !== 'rtl' ? 1 : -1

		const origin = vertical ? event.clientY : event.clientX

		// The preflight gives the field `border-box`, so the inline size is the
		// border box, as the offset size is.
		const size = vertical ? textarea.offsetHeight : textarea.offsetWidth

		grip.setPointerCapture(event.pointerId)

		// The resize cursor stays on the page for the whole drag, as the cursor of
		// the native grip does.
		const releaseCursor = holdDragCursor(vertical ? 'ns-resize' : 'ew-resize')

		const listening = new AbortController()

		listening.signal.addEventListener('abort', releaseCursor)

		live.current = listening

		const move = (moveEvent: globalThis.PointerEvent) => {
			if (!press.owns(moveEvent)) return

			const travel = sign * ((vertical ? moveEvent.clientY : moveEvent.clientX) - origin)

			textarea.style[vertical ? 'height' : 'width'] = `${Math.max(0, size + travel)}px`
		}

		const end = (endEvent: globalThis.PointerEvent) => {
			if (!press.owns(endEvent)) return

			listening.abort()

			live.current = null

			press.release()
		}

		const { signal } = listening

		grip.addEventListener('pointermove', move, { signal })

		grip.addEventListener('pointerup', end, { signal })

		grip.addEventListener('pointercancel', end, { signal })
	}

	return (
		<Shell
			data-slot="textarea-grip"
			aria-hidden="true"
			className={className}
			onPointerDown={onPointerDown}
		/>
	)
}
