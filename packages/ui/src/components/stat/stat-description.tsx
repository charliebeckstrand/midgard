import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'

/** Props for {@link StatDescription}: an optional `className` plus `<div>` attributes. */
export type StatDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Supporting copy beneath a `Stat`'s value (context, time range, footnote).
 * Static leaf: renders in React Server Components. Compose
 * `<StatDescriptionSkeleton>` in the loading tree.
 */
export function StatDescription({ className, children, ...props }: StatDescriptionProps) {
	return (
		<div data-slot="stat-description" className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
