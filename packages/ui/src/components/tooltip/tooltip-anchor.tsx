'use client'

import type { ReactNode } from 'react'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/tooltip'
import { TooltipContext } from './context'
import { TooltipBody } from './tooltip-body'
import { type TooltipAnchorOptions, useTooltipAnchor } from './use-tooltip-anchor'

/** Props for {@link TooltipAnchor}. @internal */
export type TooltipAnchorProps = TooltipAnchorOptions & {
	/**
	 * The density step, forwarded to the inner `<TooltipBody>`. Omit it to
	 * take the step of the nearest density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** Class forwarded to the inner `<TooltipBody>`. */
	className?: string
	/** Class for the positioned wrapper; see {@link TooltipContentProps.surfaceClassName}. */
	surfaceClassName?: string
	children: ReactNode
}

/**
 * An element-anchored tooltip: the standard Tooltip chrome (`<TooltipBody>` —
 * glass adoption, motion, sizing) positioned against an element the caller
 * names, opened from the caller's own state. The sibling of
 * `<TooltipPointer>`, one anchoring mode over.
 *
 * A component rather than the bare hook so consumers never touch
 * `TooltipContext`. That is the same division `<Tooltip>` and `<TooltipPointer>`
 * keep. It makes the context an implementation detail of this directory rather
 * than an interface three component families assemble by hand.
 *
 * @remarks Mount it as a **leaf**, beside whatever renders the anchor rather
 * than inside it. That is the whole reason the anchor arrives as an element.
 * Floating-ui commits its position through `flushSync`, and `autoUpdate` fires
 * on every ancestor scroll and resize. A host that renders many siblings
 * (a list, an overlay of regions) would therefore re-render all of them,
 * synchronously, per frame of a scroll. In a leaf the same commit touches this
 * panel alone.
 *
 * The body is `aria-hidden` by design; see {@link useTooltipAnchor}.
 * @internal
 * @see {@link useTooltipAnchor}
 */
export function TooltipAnchor({
	children,
	size,
	className,
	surfaceClassName,
	...options
}: TooltipAnchorProps) {
	const value = useTooltipAnchor(options)

	return (
		<TooltipContext value={value}>
			<TooltipBody size={size} className={className} surfaceClassName={surfaceClassName}>
				{children}
			</TooltipBody>
		</TooltipContext>
	)
}
