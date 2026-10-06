'use client'

import type { ReactNode } from 'react'
import type { FloatingPlacement } from '../../hooks'
import { TooltipContext } from './context'
import { useTooltipState } from './use-tooltip-state'

/** Props for {@link Tooltip}. */
export type TooltipProps = {
	/**
	 * Preferred side/alignment of the content relative to the trigger; flips on collision.
	 * A `<side>-auto` value aligns the content to the edge of the trigger that is nearer to
	 * the edge of the viewport.
	 * @defaultValue 'top'
	 */
	placement?: FloatingPlacement
	/**
	 * What opens the tooltip. Keyboard focus opens it with each value.
	 *
	 * - `'hover'`: a mouse or pen hover, or a tap. A tap gives no hover, so the
	 *   lift of a tap on the trigger opens the tooltip, and a second tap closes
	 *   it. A tap outside, Escape, or a scroll also closes it. A touch that the
	 *   browser takes for a scroll does not open it. A tap does not open it when
	 *   the trigger is, or sits inside, a control with `aria-haspopup` or
	 *   `aria-expanded`, because that tap opens the popup of the control.
	 * - `'hover-only'`: a mouse or pen hover. A tap does not open it. Use it when
	 *   the trigger is a control that a tap operates, and the tooltip only names
	 *   that control, such as the show/hide button of a password field.
	 * - `'click'`: a click from any pointer, touch included. A mouse hover does
	 *   not open it. Use it when the tooltip must not appear on a mouse hover,
	 *   such as an info button that a reader opens on purpose.
	 *
	 * @defaultValue 'hover'
	 * @remarks {@link TooltipProps.open} is the manual trigger.
	 */
	trigger?: 'hover' | 'hover-only' | 'click'
	/**
	 * Hover open delay in milliseconds (close delay is fixed at 100ms). A tap
	 * opens the tooltip with no delay.
	 * @defaultValue 250
	 */
	delay?: number
	/**
	 * Keep the content open while the pointer travels into it (safe-polygon),
	 * letting users interact with its contents.
	 * @defaultValue false
	 * @remarks The travel must read as deliberate: a pointer that crosses slower
	 * than 0.1 px/ms reads as a drift and closes the content anyway.
	 *
	 * Content that holds a tabbable control makes the panel a non-modal
	 * `role="dialog"`, because a tooltip must not hold interactive content. The
	 * trigger names the dialog. The dialog is not modal: Tab goes from the
	 * trigger into the panel controls and then on to the element after the
	 * trigger, and the page stays visible to assistive tech. Prose content keeps
	 * `role="tooltip"`.
	 */
	interactive?: boolean
	/**
	 * Suppresses the tooltip and closes any open instance. The house polarity —
	 * every other surface spells suppression `disabled`.
	 * @defaultValue false
	 */
	disabled?: boolean
	/**
	 * Hold the tooltip open regardless of pointer, for a trigger that can't take
	 * hover — an SVG shape a roving keyboard cursor drives, say. Releasing it hands
	 * control back to hover / focus / click; `disabled` still wins.
	 * @defaultValue false
	 * @remarks `false` does not hold the tooltip closed. It only releases the hold,
	 * so a hover or a focus can still open the tooltip. Use `disabled` to keep it
	 * closed.
	 */
	open?: boolean
	/**
	 * Fires when the tooltip opens or closes, whatever drove it: the hover delay, focus,
	 * a tap, or a click on a `trigger="click"` tooltip. `open`, `disabled` going
	 * true, the trigger becoming `:disabled`, and the shared overlay-close signal also
	 * report here.
	 *
	 * Observation only. The tooltip owns its open state, and {@link TooltipProps.open}
	 * only holds it open. Hover cannot be driven from outside, so `open` does not pair
	 * with this callback as a controlled prop. Use this to mirror the state elsewhere,
	 * not to control it.
	 */
	onOpenChange?: (open: boolean) => void
	children: ReactNode
}

/**
 * Hover/focus tooltip root; wires up floating state and shares `placement` and
 * `delay` with its `<TooltipTrigger>` and `<TooltipContent>` via context.
 *
 * @remarks Opens on hover or on click, as `trigger` selects, and on keyboard
 * focus. A hover tooltip opens on a tap, because a tap gives no hover. The tap
 * does not stop the click action of the trigger. A hover-only tooltip does not
 * open on a tap. Stays
 * suppressed while the trigger is `:disabled` (own attribute, ancestor
 * `<fieldset disabled>`, or a disabled descendant) and dismisses on the shared
 * overlay-close signal. The panel takes `role="tooltip"`, and `<TooltipTrigger>`
 * puts `aria-describedby` on the trigger. An `interactive` panel that holds a
 * tabbable control is a non-modal `role="dialog"` that the trigger names. The
 * trigger then carries `aria-haspopup="dialog"`, `aria-expanded`, and
 * `aria-controls`.
 * @see {@link useTooltipState}
 */
export function Tooltip({ disabled, children, ...props }: TooltipProps) {
	// The public polarity is `disabled`; the state hook and floating-ui's own
	// hooks under it read `enabled`, so the inversion happens once, here.
	const contextValue = useTooltipState({ ...props, enabled: !disabled })

	return <TooltipContext value={contextValue}>{children}</TooltipContext>
}
