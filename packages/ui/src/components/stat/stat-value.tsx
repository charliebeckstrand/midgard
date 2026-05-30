'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { densityPresets, useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import { k, type StatValueVariants } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatValueProps = StatValueVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * `size` resolution order: explicit prop, then enclosing Density size, then `'md'`.
 */
export function StatValue({ size, className, children, ...props }: StatValueProps) {
	const inherited = useDensity()

	const resolvedSize = size ? densityPresets[size].size : inherited.size

	if (useSkeleton()) {
		return <Placeholder className={cn(k.skeleton.value({ size: resolvedSize }), className)} />
	}

	return (
		<div
			data-slot="stat-value"
			className={cn(k.value({ size: resolvedSize }), className)}
			{...props}
		>
			{children}
		</div>
	)
}
