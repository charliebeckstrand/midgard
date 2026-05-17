import { cn } from '../../core'
import { DensityScope, useDensity } from '../../primitives/density'
import { kokkaku } from '../../recipes'
import type { AvatarVariants } from '../../recipes/kata/avatar'
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
			<Placeholder
				className={cn(kokkaku.avatar.base, kokkaku.avatar.size[resolvedSize], className)}
			/>
		</DensityScope>
	)
}
