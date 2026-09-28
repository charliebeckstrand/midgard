'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactNode } from 'react'
import { TooltipContext } from './context'
import { useTooltipState } from './use-tooltip-state'

/** Props for {@link Tooltip}. */
export type TooltipProps = {
	/**
	 * Preferred side/alignment of the content relative to the trigger; flips on collision.
	 * @defaultValue 'top'
	 */
	placement?: Placement
	/**
	 * Hover open delay in milliseconds (close delay is fixed at 100ms).
	 * @defaultValue 250
	 */
	delay?: number
	/**
	 * Keep the content open while the pointer travels into it (safe-polygon),
	 * letting users interact with its contents.
	 * @defaultValue false
	 * @remarks The travel must read as deliberate: a pointer that crosses slower
	 * than 0.1 px/ms reads as a drift and closes the content anyway.
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
	 * or a click on a pointer-less device. `open`, `disabled` going true, the trigger
	 * becoming `:disabled`, and the shared overlay-close signal also report here.
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
 * @remarks On pointer-less devices, opens on click rather than hover. Stays
 * suppressed while the trigger is `:disabled` (own attribute, ancestor
 * `<fieldset disabled>`, or a disabled descendant) and dismisses on the shared
 * overlay-close signal. The `tooltip` role and `aria-describedby` land on the
 * trigger via `<TooltipTrigger>`.
 * @see {@link useTooltipState}
 */
export function Tooltip({ disabled, children, ...props }: TooltipProps) {
	// The public polarity is `disabled`; the state hook and floating-ui's own
	// hooks under it read `enabled`, so the inversion happens once, here.
	const contextValue = useTooltipState({ ...props, enabled: !disabled })

	return <TooltipContext value={contextValue}>{children}</TooltipContext>
}
