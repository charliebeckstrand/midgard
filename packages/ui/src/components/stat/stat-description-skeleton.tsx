import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatDescriptionSkeletonProps = {
	className?: string
}

/** Description-shaped placeholder. */
export function StatDescriptionSkeleton({ className }: StatDescriptionSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.description, className)} />
}
