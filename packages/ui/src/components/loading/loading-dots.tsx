'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/density'
import { k, type LoadingDotsVariants } from '../../recipes/kata/loading'

export type LoadingDotsProps = LoadingDotsVariants & {
	label?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'output'>, 'className' | 'color'>

// Negative delays seat each dot at a different point in the pulse cycle;
// the wave staggers from first paint. Keyed by the (unique) delay class.
const DOT_DELAYS = [
	'motion-safe:[animation-delay:-300ms]',
	'motion-safe:[animation-delay:-150ms]',
	'motion-safe:[animation-delay:0ms]',
] as const

/** Indeterminate loading indicator: three breathing dots rendered as a live `<output>`; `size` resolves from enclosing Density, with an `sr-only` `label`. */
export function LoadingDots({
	size,
	color,
	label = 'Loading',
	className,
	...props
}: LoadingDotsProps) {
	const resolvedSize = useResolvedSize(size)

	return (
		<output
			data-slot="loading-dots"
			className={cn(k({ size: resolvedSize, color }), className)}
			{...props}
		>
			{DOT_DELAYS.map((delay) => (
				<span key={delay} aria-hidden="true" className={cn(k.dot({ size: resolvedSize }), delay)} />
			))}
			<span className="sr-only">{label}</span>
		</output>
	)
}
