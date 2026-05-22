'use client'

import { cn } from '../../core'
import { useSizeWide } from '../../primitives/density'
import { useRadius } from '../../primitives/radius'
import { type ButtonVariants, k } from '../../recipes/kata/button'
import { Placeholder } from '../placeholder'

export type ButtonSkeletonProps = {
	size?: ButtonVariants['size']
	className?: string
}

export function ButtonSkeleton({ size, className }: ButtonSkeletonProps) {
	const radius = useRadius(size)
	const resolvedSize = useSizeWide(size)

	return <Placeholder className={cn(k.skeleton.size[resolvedSize], radius, className)} />
}
