'use client'

import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { useJoin } from '../../primitives/join'
import { k } from '../../recipes/kata/control'
import { Placeholder } from '../placeholder'
import type { ControlSize } from './context'

export type ControlSkeletonProps = {
	size?: ControlSize
	className?: string
}

export function ControlSkeleton({ size, className }: ControlSkeletonProps) {
	const join = useJoin()
	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	return (
		<Placeholder
			className={cn(
				k.skeleton.base,
				join ? k.skeleton.group[resolvedSize] : k.skeleton.full,
				k.skeleton.size[resolvedSize],
				className,
			)}
		/>
	)
}
