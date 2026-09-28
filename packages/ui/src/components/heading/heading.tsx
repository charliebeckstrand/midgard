import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { InnerStep } from '../../core/density'
import { headingRamp, headingScale, k } from '../../recipes/kata/heading'

/** Semantic heading level, `1`-`6`, selecting the rendered `h1`-`h6` tag. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** Props for {@link Heading}: `level`, optional type-scale `size` shift, plus native heading attributes. */
export type HeadingProps = {
	/** @defaultValue 1 */
	level?: HeadingLevel
	/**
	 * Shifts the level's natural size along the type scale: `sm` one rung down,
	 * `lg` one up, `md` neutral. With no `size`, the heading takes the step of
	 * its nearest density scope, and `md` outside each scope.
	 */
	size?: InnerStep
	className?: string
} & Omit<ComponentProps<'h1'>, 'className'>

/**
 * Semantic heading rendering `h1`-`h6` per `level`. Weight tracks the level;
 * font size is the level's natural size shifted by `size`, or by the step of
 * the nearest density scope when `size` is omitted. Static leaf: renders in
 * React Server Components. Compose `<HeadingSkeleton>` in the
 * loading tree for a placeholder.
 */
export function Heading({ level = 1, size, className, ...props }: HeadingProps) {
	const Tag = `h${level}` as const

	return (
		<Tag
			data-slot="heading"
			className={cn(
				k({ level, scale: size && headingScale(level, size) }),
				size ? undefined : headingRamp[level],
				className,
			)}
			{...props}
		/>
	)
}
