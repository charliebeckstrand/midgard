'use client'

import type { ReactNode } from 'react'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/tooltip'
import { TooltipContext } from './context'
import { TooltipBody } from './tooltip-body'
import { type TooltipPointerOptions, useTooltipPointer } from './use-tooltip-pointer'

/** Props for {@link TooltipPointer}. @internal */
export type TooltipPointerProps = TooltipPointerOptions & {
	/**
	 * The density step, forwarded to the inner `<TooltipBody>`. Omit it to
	 * take the step of the nearest density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** Class forwarded to the inner `<TooltipBody>`. */
	className?: string
	children: ReactNode
}

/**
 * A pointer-anchored tooltip: the standard Tooltip chrome
 * (`<TooltipBody>` — glass adoption, motion, sizing) driven by a client
 * `point` rather than a DOM trigger. The chart, map, and heatmap hover readouts
 * share it, each feeding the point and `open` flag from its own hover pipeline.
 * All three therefore collapse to `<TooltipPointer>`, instead of hand-rolling
 * floating state.
 *
 * @remarks An `aria-hidden` pointer enhancement by design: it stamps no role or
 * aria (see {@link useTooltipPointer}), and the same values ship in the
 * consumer's visually-hidden table. Mark the readout body `aria-hidden`.
 * @internal
 * @see {@link useTooltipPointer}
 */
export function TooltipPointer({ children, size, className, ...options }: TooltipPointerProps) {
	const value = useTooltipPointer(options)

	return (
		<TooltipContext value={value}>
			<TooltipBody size={size} className={className}>
				{children}
			</TooltipBody>
		</TooltipContext>
	)
}
