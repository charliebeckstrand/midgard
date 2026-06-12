import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type StatDeltaVariants } from '../../recipes/kata/stat'

export type StatDeltaProps = StatDeltaVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** Static leaf: renders in React Server Components. Compose `<StatDeltaSkeleton>` in the loading tree. */
export function StatDelta({ trend, className, children, ...props }: StatDeltaProps) {
	return (
		<div data-slot="stat-delta" className={cn(k.delta({ trend }), className)} {...props}>
			{children}
		</div>
	)
}
