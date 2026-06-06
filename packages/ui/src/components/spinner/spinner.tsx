'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSize } from '../../primitives/density'
import { k, type SpinnerVariants } from '../../recipes/kata/spinner'

export type SpinnerProps = SpinnerVariants & {
	label?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'output'>, 'className' | 'color'>

// Static SVG — hoisted so it isn't recreated on every Spinner render.
const SPINNER_SVG = (
	<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full">
		<circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
		<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
	</svg>
)

/** Indeterminate loading indicator rendered as a live `<output>` — `size` resolves from enclosing Density, with an `sr-only` `label`. */
export function Spinner({ size, color, label = 'Loading', className, ...props }: SpinnerProps) {
	const resolvedSize = useSize(size)

	return (
		<output
			data-slot="spinner"
			className={cn(k({ size: resolvedSize, color }), className)}
			{...props}
		>
			{SPINNER_SVG}
			<span className="sr-only">{label}</span>
		</output>
	)
}
