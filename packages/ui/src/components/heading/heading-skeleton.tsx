import { cn } from '../../core'
import type { InnerStep } from '../../core/density'
import { headingScale, k } from '../../recipes/kata/heading'
import { Placeholder } from '../placeholder'
import type { HeadingLevel } from './heading'

/** Props for {@link HeadingSkeleton}: mirrors {@link HeadingProps} `level` and `size` to match the placeholder height. */
export type HeadingSkeletonProps = {
	/** @defaultValue 1 */
	level?: HeadingLevel
	/** With no `size`, the silhouette takes the step of its nearest density scope. */
	size?: InnerStep
	className?: string
}

/**
 * Heading-shaped placeholder. Height tracks the type-scale rung: the level
 * shifted by `size`, or by the step of the nearest density scope when `size`
 * is omitted, as the heading does. Keyed off the rung rather than a size step
 * alone; it does not use the size-driven `createSkeleton` factory.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Heading}
 */
export function HeadingSkeleton({ level = 1, size, className }: HeadingSkeletonProps) {
	const height = size ? k.skeleton.scale[headingScale(level, size)] : k.skeleton.ramp[level]

	return <Placeholder className={cn(k.skeleton.base, height, className)} />
}
