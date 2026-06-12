import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'

export type StatDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** Static leaf: renders in React Server Components. Compose `<StatDescriptionSkeleton>` in the loading tree. */
export function StatDescription({ className, children, ...props }: StatDescriptionProps) {
	return (
		<div data-slot="stat-description" className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
