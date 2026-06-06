'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/heading'
import { Placeholder } from '../placeholder'
import type { HeadingLevel } from './heading'

export type HeadingSkeletonProps = {
	level?: HeadingLevel
	className?: string
}

/**
 * Heading-shaped placeholder. Height tracks `level` (the heading recipe keys
 * its silhouette off the level, not the Density size), so it can't use the
 * size-driven `createSkeleton` factory.
 */
export function HeadingSkeleton({ level = 1, className }: HeadingSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.base, k.skeleton.level[level], className)} />
}
