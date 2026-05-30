'use client'

import { cn } from '../../core'
import { DensityScope, useDensity } from '../../primitives/density'
import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { Placeholder } from '../placeholder'

export type AvatarSkeletonProps = {
	size?: AvatarVariants['size']
	className?: string
}

export function AvatarSkeleton({ size, className }: AvatarSkeletonProps) {
	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	return (
		<DensityScope scale={size}>
			<Placeholder className={cn(k.skeleton.base, k.skeleton.size[resolvedSize], className)} />
		</DensityScope>
	)
}
