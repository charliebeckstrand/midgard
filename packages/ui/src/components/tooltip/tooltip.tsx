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
	 * Whether the tooltip can open; false suppresses it and closes any open instance.
	 * @defaultValue true
	 */
	enabled?: boolean
	/**
	 * Hold the tooltip open regardless of pointer, for a trigger that can't take
	 * hover — an SVG shape a roving keyboard cursor drives, say. Releasing it hands
	 * control back to hover / focus / click; `enabled: false` still wins.
	 * @defaultValue false
	 */
	forceOpen?: boolean
	/**
	 * Fires when the tooltip opens or closes, whatever drove it: the hover delay, focus,
	 * a click on a pointer-less device, `forceOpen`, `enabled` going false, the trigger
	 * becoming `:disabled`, or the shared overlay-close signal.
	 *
	 * Observation only. The tooltip owns its open state and there is no `open` prop to
	 * pair with — hover cannot be driven from outside, which is why the triad stops here
	 * ({@link TooltipProps.forceOpen} is the one programmatic reveal). Use this to mirror
	 * the state elsewhere, not to control it.
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
export function Tooltip({ children, ...props }: TooltipProps) {
	const contextValue = useTooltipState(props)

	return <TooltipContext value={contextValue}>{children}</TooltipContext>
}
