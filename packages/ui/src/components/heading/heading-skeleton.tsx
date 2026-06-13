import { cn } from '../../core'
import type { Step } from '../../recipes'
import { headingScale, k } from '../../recipes/kata/heading'
import { Placeholder } from '../placeholder'
import type { HeadingLevel } from './heading'

/** Props for {@link HeadingSkeleton}: mirrors {@link HeadingProps} `level` and `size` to match the placeholder height. */
export type HeadingSkeletonProps = {
	level?: HeadingLevel
	size?: Step
	className?: string
}

/**
 * Heading-shaped placeholder. Height tracks the type-scale rung (level
 * shifted by `size`, default `md`). Keyed off the rung rather than a size
 * step alone; it does not use the size-driven `createSkeleton` factory.
 */
export function HeadingSkeleton({ level = 1, size, className }: HeadingSkeletonProps) {
	const scale = headingScale(level, size ?? 'md')

	return <Placeholder className={cn(k.skeleton.base, k.skeleton.scale[scale], className)} />
}
