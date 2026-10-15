import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { k, type StatValueVariants } from '../../recipes/kata/stat'

/** Props for {@link StatValue}: the `size` variant plus `<div>` attributes. */
export type StatValueProps = StatValueVariants & {} & ComponentProps<'div'>

/**
 * Headline figure of a `Stat` — the metric's primary number. Static leaf:
 * renders in React Server Components. Without `size`, the value takes the
 * step of the nearest density scope. An explicit `size` makes the value a
 * density scope. Compose `<StatValueSkeleton>` in the loading tree.
 */
export function StatValue({ size, className, children, ...props }: StatValueProps) {
	return (
		<PolymorphicStatic
			as="div"
			data-slot="stat-value"
			density={size}
			className={cn(k.value(), className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
