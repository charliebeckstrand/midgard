import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

/** Props for {@link StatDeltaSkeleton}: an optional `className`. */
export type StatDeltaSkeletonProps = {
	className?: string
}

/** Delta-shaped placeholder. */
export function StatDeltaSkeleton({ className }: StatDeltaSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.delta, className)} />
}
