import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/fieldset'

/** Props for {@link Legend}: the native `<legend>` attributes plus `className`. */
export type LegendProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'legend'>, 'className'>

/**
 * Caption for a `<Fieldset>`, rendered as a native `<legend>` that names the
 * group for assistive tech.
 *
 * @remarks Static leaf — renders in React Server Components and fixes type scale
 * at the `md` step rather than reading the Density cascade.
 */
export function Legend({ className, ...props }: LegendProps) {
	return (
		<legend data-slot="legend" className={cn(k.legend({ size: 'md' }), className)} {...props} />
	)
}
