import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

/** Props for {@link StatDescriptionSkeleton}: an optional `className`. */
export type StatDescriptionSkeletonProps = {
	className?: string
}

/** Description-shaped placeholder. */
export function StatDescriptionSkeleton({ className }: StatDescriptionSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.description, className)} />
}
