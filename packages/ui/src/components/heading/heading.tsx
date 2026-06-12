import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { headingScale, k } from '../../recipes/kata/heading'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = {
	level?: HeadingLevel
	/**
	 * Shifts the level's natural size along the type scale: `sm` one rung down,
	 * `lg` one up, `md` (the default) neutral.
	 */
	size?: Step
	className?: string
} & Omit<ComponentPropsWithoutRef<'h1'>, 'className'>

/**
 * Semantic heading rendering `h1`-`h6` per `level`. Weight tracks the level;
 * font size is the level's natural size shifted by `size`. Static leaf:
 * renders in React Server Components. Compose `<HeadingSkeleton>` in the
 * loading tree for a placeholder.
 */
export function Heading({ level = 1, size, className, ...props }: HeadingProps) {
	const scale = headingScale(level, size ?? 'md')

	const Tag = `h${level}` as const

	return <Tag data-slot="heading" className={cn(k({ level, scale }), className)} {...props} />
}
