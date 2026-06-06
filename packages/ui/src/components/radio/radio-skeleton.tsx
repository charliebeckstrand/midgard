import { cn } from '../../core'
import { k } from '../../recipes/kata/radio'
import { Placeholder } from '../placeholder'

export type RadioSkeletonProps = {
	className?: string
}

export function RadioSkeleton({ className }: RadioSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.base, className)} />
}
