import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k, statLabelPlaceholder } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

export type StatLabelProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * `size` resolves from the enclosing concentric context, so a `<StatLabel>`
 * inside `<Density density="compact">` shrinks alongside its `<StatValue>`.
 */
export function StatLabel({ className, children, ...props }: StatLabelProps) {
	const { size } = useDensity()

	if (useSkeleton()) {
		return <Placeholder className={cn(statLabelPlaceholder({ size }), className)} />
	}

	return (
		<div data-slot="stat-label" className={cn(k.label({ size }), className)} {...props}>
			{children}
		</div>
	)
}
