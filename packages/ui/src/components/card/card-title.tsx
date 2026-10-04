import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/heading'
import { Heading } from '../heading'

/** Props for {@link CardTitle}: the density `size` step, heading `level`, and the underlying `<h3>` attributes. */
export type CardTitleProps = {
	className?: string
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * such as a `<Card size>`. A step makes the title a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Heading level of the rendered title.
	 * @defaultValue 3
	 */
	level?: 1 | 2 | 3 | 4 | 5 | 6
} & Omit<ComponentProps<'h3'>, 'className'>

/**
 * Heading for a card, rendered through `<Heading>` at `level` (default 3) on
 * the title scale. With no `size`, the title takes the step of its nearest
 * density scope. Static leaf: renders in React Server Components.
 */
export function CardTitle({ className, size, level = 3, children, ...props }: CardTitleProps) {
	return (
		<Heading
			level={level}
			size={size}
			data-slot="card-title"
			className={cn(k.ramp[4], className)}
			{...props}
		>
			{children}
		</Heading>
	)
}
