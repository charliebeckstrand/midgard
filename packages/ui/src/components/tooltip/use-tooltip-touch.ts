'use client'

import { type ElementProps, type FloatingRootContext, useDismiss } from '@floating-ui/react'
import { type PointerEvent, type RefObject, useMemo, useState } from 'react'

type TooltipTouchOptions = {
	/** Whether the touch rule applies. It applies to a hover tooltip that is on. */
	enabled: boolean
	/**
	 * Gets the `pointerType` of the last pointer on the trigger. The gate of
	 * `useTooltipState` reads it.
	 */
	pointerTypeRef: RefObject<string>
}

/**
 * The touch rule of a hover {@link Tooltip}. A touch press on the trigger opens
 * the tooltip, and a second touch press closes it.
 *
 * @remarks The rule reads the `pointerType` of the `pointerdown` event, not a
 * media query, and it does not wait for `click`. A touch gives no hover, and
 * iOS Safari sends no hover event for a tap. It sends only the compatibility
 * mouse events after the lift. A tap also does not move the focus to an
 * element that cannot take focus. The press does not cancel its event, so the
 * click action of the trigger still occurs.
 *
 * The compatibility mouse events of a tap move the emulated hover to the
 * trigger. The hover of floating-ui forgets the pointer type when the tooltip
 * closes, so the mouse events of the tap that closes the tooltip can open it
 * again. Each pointer on the trigger therefore writes its type to
 * `pointerTypeRef`, and the gate refuses a hover open after a touch. A mouse
 * pointer writes its own type when it enters or moves, so a mouse hover opens
 * the tooltip again.
 *
 * A tooltip that a touch opened also closes on a scroll of an ancestor of the
 * trigger or the panel. A tap outside and Escape close it through the dismiss
 * wiring that each tooltip has.
 *
 * @returns The interactions of the rule, for `useInteractions`.
 * @internal
 */
export function useTooltipTouch(
	context: FloatingRootContext,
	{ enabled, pointerTypeRef }: TooltipTouchOptions,
): ElementProps[] {
	const { open, onOpenChange } = context

	// Whether a touch press opened the tooltip. Adjusted during render: the
	// flag clears in the render that closes the tooltip.
	const [touchOpen, setTouchOpen] = useState(false)

	if (touchOpen && !open) setTouchOpen(false)

	const scroll = useDismiss(context, {
		enabled: enabled && touchOpen,
		escapeKey: false,
		outsidePress: false,
		ancestorScroll: true,
	})

	const press = useMemo<ElementProps>(() => {
		if (!enabled) return {}

		const note = (event: PointerEvent) => {
			pointerTypeRef.current = event.pointerType
		}

		return {
			reference: {
				onPointerEnter: note,
				onPointerMove: note,
				onPointerDown: (event: PointerEvent) => {
					note(event)

					if (event.pointerType !== 'touch' || !event.isPrimary) return

					setTouchOpen(!open)

					onOpenChange(!open, event.nativeEvent, 'click')
				},
			},
		}
	}, [enabled, open, onOpenChange, pointerTypeRef])

	return [press, scroll]
}
