'use client'

import { type ElementProps, type FloatingRootContext, useDismiss } from '@floating-ui/react'
import { type PointerEvent, type RefObject, useMemo, useRef, useState } from 'react'

/**
 * A control that opens a popup or shows a region of its own. A tap on such a
 * control opens that popup, not the tooltip.
 */
const POPUP_CONTROL = '[aria-haspopup]:not([aria-haspopup="false"]), [aria-expanded]'

type TooltipTouchOptions = {
	/** Whether the touch rule applies. It applies to a hover tooltip that is on. */
	enabled: boolean
	/**
	 * Whether the panel is a dialog. The trigger then carries the popup
	 * attributes of this tooltip, and the popup test starts at its parent.
	 */
	dialog: boolean
	/**
	 * Gets the `pointerType` of the last pointer on the trigger. The gate of
	 * `useTooltipState` reads it.
	 */
	pointerTypeRef: RefObject<string>
}

/**
 * Whether the trigger is, or sits inside, a control that opens a popup of its
 * own, such as a Listbox button.
 */
function insidePopupControl(trigger: Element, dialog: boolean): boolean {
	const start = dialog ? trigger.parentElement : trigger

	return start?.closest(POPUP_CONTROL) != null
}

/**
 * The touch rule of a hover {@link Tooltip}. A tap on the trigger opens the
 * tooltip, and a second tap closes it.
 *
 * @remarks The rule reads the `pointerType` of the pointer events, not a media
 * query, and it does not wait for `click`. A touch gives no hover, and iOS
 * Safari sends no hover event for a tap. It sends only the compatibility mouse
 * events after the lift. A tap also does not move the focus to an element that
 * cannot take focus. The rule does not cancel an event, so the click action of
 * the trigger still occurs.
 *
 * A touch `pointerdown` arms the rule, and the `pointerup` of the same pointer
 * opens or closes the tooltip. When the browser takes the gesture for a scroll
 * or a zoom, it sends `pointercancel` in place of `pointerup`, and the rule
 * disarms. A scroll that starts on the trigger therefore shows no tooltip.
 *
 * A tap on a trigger inside a control that opens a popup, such as the label of
 * a Listbox button, opens that popup and not the tooltip. The control carries
 * `aria-haspopup` or `aria-expanded`. A tap can still close an open tooltip
 * there.
 *
 * The compatibility mouse events of a tap move the emulated hover to the
 * trigger. The hover of floating-ui forgets the pointer type when the tooltip
 * closes, so the mouse events of the tap that closes the tooltip can open it
 * again. Each pointer on the trigger therefore writes its type to
 * `pointerTypeRef`, and the gate refuses a hover open after a touch. A mouse
 * pointer writes its own type when it enters or moves, so a mouse hover opens
 * the tooltip again. A tap closes with the `'reference-press'` reason, so
 * `useFocus` does not open the tooltip again when a dialog panel puts focus
 * back on the trigger.
 *
 * A tooltip that a tap opened also closes on a scroll of an ancestor of the
 * trigger or the panel. A tap outside and Escape close it through the dismiss
 * wiring that each tooltip has.
 *
 * @returns The interactions of the rule, for `useInteractions`.
 * @internal
 */
export function useTooltipTouch(
	context: FloatingRootContext,
	{ enabled, dialog, pointerTypeRef }: TooltipTouchOptions,
): ElementProps[] {
	const { open, onOpenChange } = context

	// Whether a tap opened the tooltip. Adjusted during render: the flag clears
	// in the render that closes the tooltip.
	const [touchOpen, setTouchOpen] = useState(false)

	if (touchOpen && !open) setTouchOpen(false)

	// The `pointerId` of the touch press that armed the rule, or `null`.
	const armedRef = useRef<number | null>(null)

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

		const disarm = (event: PointerEvent) => {
			if (armedRef.current === event.pointerId) armedRef.current = null
		}

		return {
			reference: {
				onPointerEnter: note,
				onPointerMove: note,
				onPointerDown: (event: PointerEvent) => {
					note(event)

					armedRef.current = null

					if (event.pointerType !== 'touch' || !event.isPrimary) return

					if (!open && insidePopupControl(event.currentTarget, dialog)) return

					armedRef.current = event.pointerId
				},
				onPointerUp: (event: PointerEvent) => {
					if (armedRef.current !== event.pointerId) return

					armedRef.current = null

					setTouchOpen(!open)

					onOpenChange(!open, event.nativeEvent, open ? 'reference-press' : 'click')
				},
				onPointerCancel: disarm,
			},
		}
	}, [enabled, dialog, open, onOpenChange, pointerTypeRef])

	return [press, scroll]
}
