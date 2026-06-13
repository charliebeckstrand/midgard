import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

/** Props for {@link StatLabelSkeleton}: an optional `className`. */
export type StatLabelSkeletonProps = {
	className?: string
}

/** Label-shaped placeholder. */
export function StatLabelSkeleton({ className }: StatLabelSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.label({ size: 'md' }), className)} />
}
