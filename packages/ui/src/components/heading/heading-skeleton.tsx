import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { k } from '../../recipes/kata/heading'
import { Placeholder } from '../placeholder'
import type { HeadingLevel } from './heading'

/** Props for {@link HeadingSkeleton}: mirrors {@link HeadingProps} `level` and `size` to match the placeholder height. */
export type HeadingSkeletonProps = {
	/** @defaultValue 1 */
	level?: HeadingLevel
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the silhouette a density scope.
	 */
	size?: DensityStep
	className?: string
}

/**
 * Heading-shaped placeholder. Its height tracks the rung of the heading at each
 * step, and it takes the step of the nearest density scope, as the heading
 * does. Keyed off the level, so it does not use the `createSkeleton` factory.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Heading}
 */
export function HeadingSkeleton({ level = 1, size, className }: HeadingSkeletonProps) {
	return (
		<Placeholder
			data-density={size}
			className={cn(k.skeleton.base, k.skeleton.ramp[level], className)}
		/>
	)
}
