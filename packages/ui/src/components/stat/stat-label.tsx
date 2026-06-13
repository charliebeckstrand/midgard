import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'

/** Props for {@link StatLabel}: an optional `className` plus `<div>` attributes. */
export type StatLabelProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Caption naming the metric a `Stat` reports, sitting above its value. Static
 * leaf: renders in React Server Components. Renders at the `md` step; compose
 * `<StatLabelSkeleton>` in the loading tree.
 */
export function StatLabel({ className, children, ...props }: StatLabelProps) {
	return (
		<div data-slot="stat-label" className={cn(k.label({ size: 'md' }), className)} {...props}>
			{children}
		</div>
	)
}
