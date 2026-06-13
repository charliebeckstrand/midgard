import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'

/** Props for {@link Stat}: an optional `className` plus `<div>` attributes. */
export type StatProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Composition root for a data-display metric: a full-height flex column that
 * stacks `<StatLabel>`, `<StatValue>`, `<StatDelta>`, and `<StatDescription>`
 * children with consistent spacing. Holds no value of its own; arrange the
 * sub-parts to taste. A static leaf with no client hooks, so it renders in
 * React Server Components; mirror its tree with the matching `*Skeleton` parts
 * while loading.
 */
export function Stat({ className, children, ...props }: StatProps) {
	return (
		<div data-slot="stat" className={cn(k(), className)} {...props}>
			{children}
		</div>
	)
}
