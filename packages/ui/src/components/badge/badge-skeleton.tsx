'use client'

import { cn } from '../../core'
import { useSizeWide } from '../../primitives/density'
import { kokkaku } from '../../recipes'
import type { BadgeVariants } from '../../recipes/kata/badge'
import { Placeholder } from '../placeholder'

export type BadgeSkeletonProps = {
	size?: BadgeVariants['size']
	className?: string
}

export function BadgeSkeleton({ size, className }: BadgeSkeletonProps) {
	const resolvedSize = useSizeWide(size)

	return (
		<Placeholder className={cn(kokkaku.badge.base, kokkaku.badge.size[resolvedSize], className)} />
	)
}
