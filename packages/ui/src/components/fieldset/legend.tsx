import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/fieldset'

export type LegendProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'legend'>, 'className'>

/** Static leaf: renders in React Server Components. Renders at the `md` step. */
export function Legend({ className, ...props }: LegendProps) {
	return (
		<legend data-slot="legend" className={cn(k.legend({ size: 'md' }), className)} {...props} />
	)
}
