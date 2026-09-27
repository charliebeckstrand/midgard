import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { titleRamp, titleSize } from '../../recipes/kata/heading'
import { Heading } from '../heading'

/** Props for {@link CardTitle}: title-scale `size`, heading `level`, and the underlying `<h3>` attributes. */
export type CardTitleProps = {
	className?: string
	/**
	 * Step on the title type scale. With no step, the title follows the nearest
	 * density scope, such as a `<Card size>`, and `md` outside one.
	 */
	size?: Step
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
			data-slot="card-title"
			className={cn(size ? titleSize(size) : titleRamp, className)}
			{...props}
		>
			{children}
		</Heading>
	)
}
