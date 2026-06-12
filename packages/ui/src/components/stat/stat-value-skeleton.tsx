import { cn } from '../../core'
import { k, type StatValueVariants } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatValueSkeletonProps = {
	size?: StatValueVariants['size']
	className?: string
}

/** Value-shaped placeholder; pair with the real `<StatValue size>`. */
export function StatValueSkeleton({ size, className }: StatValueSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.value({ size: size ?? 'md' }), className)} />
}
