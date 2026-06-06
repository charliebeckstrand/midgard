import { cn } from '../../core'
import { k } from '../../recipes/kata/heading'
import { Placeholder } from '../placeholder'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingSkeletonProps = {
	level?: HeadingLevel
	className?: string
}

export function HeadingSkeleton({ level = 1, className }: HeadingSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.base, k.skeleton.level[level], className)} />
}
