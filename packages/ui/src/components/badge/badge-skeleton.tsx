'use client'

import { cn } from '../../core'
import { useSizeWide } from '../../primitives/density'
import { type BadgeVariants, k } from '../../recipes/kata/badge'
import { Placeholder } from '../placeholder'

export type BadgeSkeletonProps = {
	size?: BadgeVariants['size']
	className?: string
}

export function BadgeSkeleton({ size, className }: BadgeSkeletonProps) {
	const resolvedSize = useSizeWide(size)

	return <Placeholder className={cn(k.skeleton.base, k.skeleton.size[resolvedSize], className)} />
}
