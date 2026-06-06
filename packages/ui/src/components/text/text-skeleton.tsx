import { cn } from '../../core'
import { k } from '../../recipes/kata/text'
import { Placeholder } from '../placeholder'

export type TextSkeletonProps = {
	className?: string
}

export function TextSkeleton({ className }: TextSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.base, className)} />
}
