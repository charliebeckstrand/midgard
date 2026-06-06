'use client'

import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import { headingScale, k } from '../../recipes/kata/heading'
import { Placeholder } from '../placeholder'
import type { HeadingLevel } from './heading'

export type HeadingSkeletonProps = {
	level?: HeadingLevel
	size?: Step
	className?: string
}

/**
 * Heading-shaped placeholder. Height tracks the resolved type-scale rung
 * (level shifted by the ambient density `size` axis), so the silhouette
 * matches the real heading at every density. Keyed off the rung rather than
 * the Density step alone, so it can't use the size-driven `createSkeleton`
 * factory.
 */
export function HeadingSkeleton({ level = 1, size, className }: HeadingSkeletonProps) {
	const { size: ambient } = useDensity()

	const scale = headingScale(level, size ?? ambient)

	return <Placeholder className={cn(k.skeleton.base, k.skeleton.scale[scale], className)} />
}
