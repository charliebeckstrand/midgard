'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSize } from '../../primitives/density'
import { k, type LoadingSpinnerVariants } from '../../recipes/kata/loading'

export type LoadingSpinnerProps = LoadingSpinnerVariants & {
	label?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'output'>, 'className' | 'color'>

const SPINNER_SVG = (
	<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full">
		<circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
		<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
	</svg>
)

/** Indeterminate loading indicator rendered as a live `<output>`; `size` resolves from enclosing Density, with an `sr-only` `label`. */
export function LoadingSpinner({
	size,
	color,
	label = 'Loading',
	className,
	...props
}: LoadingSpinnerProps) {
	const resolvedSize = useSize(size)

	return (
		<output
			data-slot="loading-spinner"
			className={cn(k.spinner({ size: resolvedSize, color }), className)}
			{...props}
		>
			{SPINNER_SVG}
			<span className="sr-only">{label}</span>
		</output>
	)
}
