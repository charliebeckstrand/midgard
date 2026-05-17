'use client'

import { cn } from '../../core'
import { useSizeWide } from '../../primitives/density'
import { kokkaku } from '../../recipes'
import type { ButtonVariants } from '../../recipes/kata/button'
import { Placeholder } from '../placeholder'

export type ButtonSkeletonProps = {
	size?: ButtonVariants['size']
	className?: string
}

export function ButtonSkeleton({ size, className }: ButtonSkeletonProps) {
	const resolvedSize = useSizeWide(size)

	return (
		<Placeholder
			className={cn(kokkaku.button.base, kokkaku.button.size[resolvedSize], className)}
		/>
	)
}
