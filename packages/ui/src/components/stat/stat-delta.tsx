import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type StatDeltaVariants, statDeltaVariants, statPlaceholder } from './variants'

export type StatDeltaProps = StatDeltaVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDelta({ trend, className, children, ...props }: StatDeltaProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(statPlaceholder.delta, className)} />
	}

	return (
		<div data-slot="stat-delta" className={cn(statDeltaVariants({ trend }), className)} {...props}>
			{children}
		</div>
	)
}
