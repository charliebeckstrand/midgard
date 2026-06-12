import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type StatValueVariants } from '../../recipes/kata/stat'

export type StatValueProps = StatValueVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Static leaf: renders in React Server Components. `size` is explicit and
 * defaults to `md`; compose `<StatValueSkeleton>` in the loading tree.
 */
export function StatValue({ size, className, children, ...props }: StatValueProps) {
	return (
		<div
			data-slot="stat-value"
			className={cn(k.value({ size: size ?? 'md' }), className)}
			{...props}
		>
			{children}
		</div>
	)
}
