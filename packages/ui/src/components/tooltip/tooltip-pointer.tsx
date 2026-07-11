'use client'

import type { ReactNode } from 'react'
import type { Step } from '../../recipes'
import { TooltipContext } from './context'
import { TooltipContent } from './tooltip-content'
import { type TooltipPointerOptions, useTooltipPointer } from './use-tooltip-pointer'

/** Props for {@link TooltipPointer}. @internal */
export type TooltipPointerProps = TooltipPointerOptions & {
	/** Size step forwarded to the inner `<TooltipContent>`. @defaultValue the enclosing Density size */
	size?: Step
	/** Class forwarded to the inner `<TooltipContent>`. */
	className?: string
	children: ReactNode
}

/**
 * A pointer-anchored tooltip: the standard Tooltip chrome
 * (`<TooltipContent>` — glass adoption, motion, sizing) driven by a client
 * `point` rather than a DOM trigger. The chart, map, and heatmap hover readouts
 * share it, each feeding the point and `open` flag from its own hover pipeline,
 * so all three collapse to `<TooltipPointer>` instead of hand-rolling floating
 * state.
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
			<TooltipContent size={size} className={className}>
				{children}
			</TooltipContent>
		</TooltipContext>
	)
}
