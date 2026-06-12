import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'

export type StatLabelProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Static leaf: renders in React Server Components. Renders at the `md` step;
 * compose `<StatLabelSkeleton>` in the loading tree.
 */
export function StatLabel({ className, children, ...props }: StatLabelProps) {
	return (
		<div data-slot="stat-label" className={cn(k.label({ size: 'md' }), className)} {...props}>
			{children}
		</div>
	)
}
