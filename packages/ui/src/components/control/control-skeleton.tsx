'use client'

import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { useJoin } from '../../primitives/join'
import { kokkaku } from '../../recipes'
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
				kokkaku.formControl.base,
				join ? kokkaku.formControl.group[resolvedSize] : kokkaku.formControl.full,
				kokkaku.formControl.size[resolvedSize],
				className,
			)}
		/>
	)
}
