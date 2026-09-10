'use client'

import type { ReactNode } from 'react'
import type { Step } from '../../recipes'
import { TooltipContext } from './context'
import { TooltipContent } from './tooltip-content'
import { type TooltipAnchorOptions, useTooltipAnchor } from './use-tooltip-anchor'

/** Props for {@link TooltipAnchor}. @internal */
export type TooltipAnchorProps = TooltipAnchorOptions & {
	/** Size step forwarded to the inner `<TooltipContent>`. @defaultValue the enclosing Density size */
	size?: Step
	/** Class forwarded to the inner `<TooltipContent>`. */
	className?: string
	children: ReactNode
}

/**
 * An element-anchored tooltip: the standard Tooltip chrome (`<TooltipContent>` —
 * glass adoption, motion, sizing) positioned against an element the caller
 * names, opened from the caller's own state. The sibling of
 * `<TooltipPointer>`, one anchoring mode over.
 *
 * A component rather than the bare hook so consumers never touch
 * `TooltipContext` — the same division `<Tooltip>` and `<TooltipPointer>` keep,
 * and what makes the context an implementation detail of this directory rather
 * than an interface three component families assemble by hand.
 *
 * @remarks Mount it as a **leaf**, beside whatever renders the anchor rather
 * than inside it. That is the whole reason the anchor arrives as an element:
 * floating-ui commits its position through `flushSync`, and `autoUpdate` fires
 * on every ancestor scroll and resize — so a host that renders many siblings
 * (a list, an overlay of regions) would re-render all of them, synchronously,
 * per frame of a scroll. In a leaf the same commit touches this panel alone.
 *
 * The body is `aria-hidden` by design; see {@link useTooltipAnchor}.
 * @internal
 * @see {@link useTooltipAnchor}
 */
export function TooltipAnchor({ children, size, className, ...options }: TooltipAnchorProps) {
	const value = useTooltipAnchor(options)

	return (
		<TooltipContext value={value}>
			<TooltipContent size={size} className={className}>
				{children}
			</TooltipContent>
		</TooltipContext>
	)
}
