'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactNode } from 'react'
import type { Step } from '../../recipes'
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
	 * Size step applied to the tooltip content. Forwarded via context to
	 * `<TooltipContent>`; an explicit `size` there still wins. When unset,
	 * content falls back to the enclosing Density size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

/**
 * Hover/focus tooltip root; wires up floating state and shares `placement`,
 * `delay`, and `size` with its `<TooltipTrigger>` and `<TooltipContent>` via
 * context.
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
