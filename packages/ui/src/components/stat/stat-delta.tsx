import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { type StatDeltaVariants, statDelta, statPlaceholder } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatDeltaProps = StatDeltaVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDelta({ trend, className, children, ...props }: StatDeltaProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(statPlaceholder.delta, className)} />
	}

	return (
		<div data-slot="stat-delta" className={cn(statDelta({ trend }), className)} {...props}>
			{children}
		</div>
	)
}
