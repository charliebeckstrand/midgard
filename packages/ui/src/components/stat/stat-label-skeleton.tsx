import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatLabelSkeletonProps = {
	className?: string
}

/** Label-shaped placeholder. */
export function StatLabelSkeleton({ className }: StatLabelSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.label({ size: 'md' }), className)} />
}
