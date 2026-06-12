import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatDeltaSkeletonProps = {
	className?: string
}

/** Delta-shaped placeholder. */
export function StatDeltaSkeleton({ className }: StatDeltaSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.delta, className)} />
}
