import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { headingRamp, k } from '../../recipes/kata/heading'

/** Semantic heading level, `1`-`6`, selecting the rendered `h1`-`h6` tag. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** Props for {@link Heading}: `level`, the density `size` step, plus native heading attributes. */
export type HeadingProps = {
	/** @defaultValue 1 */
	level?: HeadingLevel
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the heading a density scope. The level sets the natural size
	 * at `md`, and each step moves it one rung of the type scale.
	 */
	size?: DensityStep
	className?: string
} & Omit<ComponentProps<'h1'>, 'className'>

/**
 * Semantic heading rendering `h1`-`h6` per `level`. Weight tracks the level.
 * The font size is the natural size of the level, moved one rung for each step
 * away from `md`. The heading takes the step of the nearest density scope, and
 * an explicit `size` makes the heading a density scope. Static leaf: renders in
 * React Server Components. Compose `<HeadingSkeleton>` in the loading tree for
 * a placeholder.
 */
export function Heading({ level = 1, size, className, children, ...props }: HeadingProps) {
	return (
		<PolymorphicStatic
			as={`h${level}`}
			data-slot="heading"
			density={size}
			className={cn(k({ level }), headingRamp[level], className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
