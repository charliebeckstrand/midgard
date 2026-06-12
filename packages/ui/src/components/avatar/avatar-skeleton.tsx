import { cn } from '../../core'
import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { Placeholder } from '../placeholder'

export type AvatarSkeletonProps = {
	size?: AvatarVariants['size']
	className?: string
}

/** Avatar-shaped placeholder; `size` is explicit and defaults to `md`. */
export function AvatarSkeleton({ size, className }: AvatarSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.base, k.skeleton.size[size ?? 'md'], className)} />
}
